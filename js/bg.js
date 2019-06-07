//webSocket
var WS = null,tmphost = 'jqx.xiaoaidema.com',Host = 'http://'+tmphost,WSFD = 0,TB_ID=0,
    //上次连接的旧的websocket fd
    WS_OLD_FD = localStorage['WS_OLD_FD'] ? localStorage['WS_OLD_FD'] : 0,USER_TOKEN = null;
chrome.storage.sync.get('tb_info', function(r) {
    if (r && r['tb_info']) {
        if (r['tb_info']['tb_id']) {
            TB_ID = r['tb_info']['tb_id'];
        }
    }
});
chrome.storage.sync.get('user_token', function(r) {
    if (r && r['user_token']) {
        //把用户token 付给变量
        if (r['user_token']) {
            USER_TOKEN = r['user_token'];
        }
    }

    try {
        WS = new ReconnectingWebSocket('ws://'+tmphost+':9501', null, {debug: true, reconnectInterval: 300000});

        WS.onopen = (evt) => {
            console.log('websocket连接开启', evt);
            //todo 发送用户信息
            Util.wsSend({'class':'User',action:'getFd',content:{old_fd:WS_OLD_FD,user_token:USER_TOKEN}});
        };

        WS.onclose = (evt) => {
            //todo 告诉服务器关闭 不然造成fd的浪费
            console.log('websocket连接关闭', evt);
        };

        WS.onmessage = (evt) => {
            console.log('websocket收到数据', evt);
            let data = JSON.parse(evt.data);
            switch (data.type) {
                //用户websocket连接成功 open 请求回来的首次登陆消息
                case 'set_fd':
                    WSFD = localStorage['WS_OLD_FD'] = data.fd;
                    //获取带抢购列表
                    Util.jhsNumIid = data.init['jhs_num_iid'];
                    Util.getMyQgItem();
                    Util.setUserToken(data.user_token);
                    if (!data.init['has_tb_id']) {
                        Util.setTbId(TB_ID);
                    }
                    break;
                case 'notice':
                    Util.notice(data.data);
                    break;
            }
        };

        WS.onerror = (evt, e) => {
            //todo 通过ajax 告诉 服务器杀掉fd
            console.log('websocket发生错误', evt, e);
        };
        //监听窗口关闭事件，当窗口关闭时，主动去关闭websocket连接，防止连接还没断开就关闭窗口，server端会抛异常。
        window.onbeforeunload = function () {
            if (WS_OLD_FD) WS.close();
        }
    } catch (e) {
        console.log('websocket连接失败', e);
    }
});



/**
 * 工具类
 * @type {{wsSend: Util.wsSend}}
 */
var Util = {
    jhsNumIid:0,
    //设置用户的token
    setUserToken:function(token){
        if (token == USER_TOKEN) {
            return;
        }
        chrome.storage.sync.set({user_token:token},()=> {
            USER_TOKEN = token;
        });
    },
    systemTime : (new Date()).getTime(),
    qgPageOpenOnce:false,
    //抢购队列
    qgList:{},
    proofTabId:0,
    currentQgKey:null,//当前抢购列表的key值
    currentQgCount:0,//当前抢购列表的商品数量
    currentQgSucNum:0,
    tabNumIidCache:{},
    currentNumIid:0,
    openCartabTd:0,
    //定时检查抢购队列
    timestampToTime:function(timestamp) {
        var date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
        Y = date.getFullYear() + '-';
        M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
        D = date.getDate() + ' ';
        h = date.getHours() + ':';
        m = date.getMinutes() + ':';
        s = date.getSeconds();
        return Y+M+D+h+m+s;
    },
    checkQgLazyTime:20000,
    checkQg : function(){
        let sTime = new Date().getTime();
        console.log("checkQg本地时间 - 淘宝时间", Util.timestampToTime(sTime),'-',Util.timestampToTime(Util.systemTime),sTime - Util.systemTime);
        let lazyTime = Util.checkQgLazyTime;
        for(let stime in Util.qgList) {
            let cha = stime*1 - Util.systemTime;
            if (cha <= 0) {
                console.log("cha小于0 无须在检测次列表",cha);
                continue;
            }
            let nowStimeList = Util.qgList[stime];
            let keyArr = Object.keys(nowStimeList);
            //准备打开页面抢购 进入抢购页面 尽量不要太多

            if (cha <= (keyArr.length + 4) * lazyTime) {
                Util.currentQgKey = stime;// 把当前要抢购的商品暂存起来
                Util.currentQgCount = 0;//初始化
                let openOne = false;
                for (let num_iid in nowStimeList) {
                    //判断是否已经打开了tab标签进行抢购
                    if (nowStimeList[num_iid]['tab'] || openOne) {
                        continue;
                    }
                    //开启页面
                    let url = nowStimeList[num_iid].url;
                    let car = keyArr.length > 1 ? '&decision=cart' : '';
                    if (url.indexOf('item.taobao.com/item') != -1) {
                        //判断是淘宝的商品
                        url = 'https://h5.m.taobao.com/awp/core/detail.htm?'+(url.split('?')[1]);
                    } else {
                        url = url.replace(/:\/\/.*detail./,'://detail.m.')+car;
                    }

                    chrome.tabs.create({
                        url:url,//多条抢购使用加入购物车 单条是 立即抢
                        selected:false
                    }, tab => {
                        nowStimeList[num_iid]['tab'] = tab.id;
                        Util.currentQgCount++;
                        let time = new Date();
                        console.log(time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'打开了手机页面进行购买',url);
                    });
                    //每次只开启一个页面
                    openOne = true;
                }
                if (keyArr.length > 1 && !openOne && !Util.openCartabTd) {
                    //todo 打开购物车页面监听
                    let url ='https://h5.m.taobao.com/mlapp/cart.html?cartfrom=detail';
                    chrome.tabs.create({
                        url:url,//多条抢购使用加入购物车 单条是 立即抢
                        selected:false
                    }, tab => {
                        Util.openCartabTd = tab.id;
                        //console.log('打开了手机购物车',Util.openCartabTd);
                    });
                }
            }

            if (keyArr.length>0) {
                Util.currentNumIid = keyArr[0];
            }
        }
        let eTime = new Date().getTime();
        Util.systemTime = Util.systemTime * 1 + lazyTime + (eTime - sTime);
        //lazyTime秒检测一次 相当于lazyTime 秒后打开一个抢购的商品
        if (Util.startCheckQgList) { //表示需要继续
            setTimeout(Util.checkQg, lazyTime);
        }
    },
    getBjTime:function(){
        let sTime = new Date().getTime();
        $.get('http://bjtime.cn/nt.asp',function (d) {
            let eTime = new Date().getTime();
            d*=1;
            console.log("用时",eTime-sTime,"本地时间 - 北京时间", Util.timestampToTime(eTime),'-',Util.timestampToTime(d),eTime - d);
        });
    },
    getAliTime:function(){
        $.ajax({
            url:"https://t.alicdn.com/t/gettime?_ksTS=1550640840498_182&callback=jsonp183",
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('jsonp183(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    d=d.time*1000;
                    console.log("阿里时间戳",Util.timestampToTime(d));
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    },
    //定时器标识
    qgPageOpenOnceTime:3*60*1000,//聚划算接口检测时间间隔
    startCheckQgList:0,//聚划算接口检测长时间间隔
    //重置心跳包
    getTbTimeFlag:0,
    getTbTime:function(){
        if (Util.getTbTimeFlag) {
            window.clearTimeout(Util.getTbTimeFlag);
        }
        var qgKeyArr = Object.keys(Util.qgList);
        if (qgKeyArr.length == 0) {
            Util.startCheckQgList = 0;
            console.log('已经全部抢购完毕，列表为空');
            //setTimeout(Util.getTbTime,Util.qgPageOpenOnceTime);
            return;
        }

        let jhsNowTimeInfoUrl = 'https://dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+Util.jhsNumIid;
        var sTime = 0,LazyTime = 0;
        $.ajax({
            url:jhsNowTimeInfoUrl,
            dataType:'json',
            beforeSend:function(xhr){
                sTime = new Date().getTime();
            },
            success:function (d,status,xhr) {
                if (d && d.data) {
                    //登录淘宝 跟时间校验 有要抢的宝贝 且 当前时间<= 抢购时间 且 当前时间 >= 抢购时间-两（防止漏掉）个轮训时间
                    let minStime = Util.arrayMin(qgKeyArr, d.data.time);
                    if (!minStime) {
                        //代表没有可以抢购的东西[超时 列表空都是这种情况]
                        console.log("没有可以抢购的", minStime);
                        Util.startCheckQgList = 0;
                        return;
                    }
                    if (d.data.isLogin == 0 && minStime &&
                        d.data.time <= minStime && d.data.time >= minStime - 2 * Util.qgPageOpenOnceTime) {
                        console.log("这个时间需要淘宝登录");
                        //todo 提示登录
                        Util.loginTb();
                    }
                    let eTime = new Date().getTime();
                    let tbTime = d.data.time*1;
                    if (!Util.startCheckQgList) {
                        Util.systemTime = tbTime + 2;
                    }
                    //提前 4个 open coupon 时间单位
                    let cheDTime = Util.checkQgLazyTime * (Object.keys(Util.qgList[minStime]).length * 1 + 4);
                    cheDTime = Math.max(1800000,cheDTime);//取一个大的
                    if (Util.systemTime < minStime - cheDTime) {
                        LazyTime = minStime - Util.systemTime - cheDTime - 5000;
                        Util.startCheckQgList = 0;
                        console.log("在",LazyTime,'后开始在调用淘宝接口对时间',cheDTime);
                    } else {
                        if (!Util.startCheckQgList){
                            Util.startCheckQgList = 1;
                            Util.checkQg();
                        }//同时也在这个时间

                        LazyTime = Util.qgPageOpenOnceTime;
                        console.log("从新恢复正常时间间隔调用淘宝接口",LazyTime);
                    }
                    console.log("用时",eTime-sTime,"本地时间 -淘宝时间", Util.timestampToTime(eTime),'-',Util.timestampToTime(tbTime),eTime - tbTime);
                }
                Util.getTbTimeFlag = setTimeout(Util.getTbTime, LazyTime);
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText);
                Util.getTbTimeFlag = setTimeout(Util.getTbTime, Util.qgPageOpenOnceTime);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }

            }
        });
    },
    arrayMin:function(arrs, now){
        let min = arrs[0];
        console.log("arrayMin", arrs,now)
        for(let i = 0; i < arrs.length; i++) {
            if(now - arrs[i] > 30000 ){
                //删除已经过去10分钟的列表
                delete Util.qgList[arrs[i]];
                continue;
            }
            if(arrs[i] > now && arrs[i] < min) {
                min = arrs[i];
            }
        }
        console.log("最小抢购时间",min , now,min - now);
        return min > now ? min : 0;
    },
    loginTbId:0,
    loginTb:function(){
        console.log("准备登陆");
        chrome.storage.sync.get('tb_info', function(r) {
            console.log(r);
            if(r && r['tb_info']) {
                let loginInfo = r['tb_info'];
                if (loginInfo.tb_username && loginInfo.tb_password) {
                    chrome.tabs.create({
                        url:'https://login.m.taobao.com/login.htm?loginFrom=wap_tmall',
                        index:0,
                        selected:false
                    }, tab => {
                        Util.loginTbId= tab.id;
                        setTimeout(function () {
                            if(Util.loginTbId){
                                chrome.tabs.remove(Util.loginTbId);
                            }
                        },12000);
                    });
                } else {
                    console.log("淘宝信息为空");
                }
            }
        });
    },
    delQgList:function(id){
        let qgInfo = sessionStorage['qg_'+id];
        sessionStorage.removeItem('qg_'+id);
        //删除变量队列
        if (qgInfo) {
            qgInfo = JSON.parse(qgInfo);
            if (Util.qgList[qgInfo.start_time] && Util.qgList[qgInfo.start_time][id]) {
                delete Util.qgList[qgInfo.start_time][id];
                if (Object.keys(Util.qgList[qgInfo.start_time]).length == 0) {
                    delete Util.qgList[qgInfo.start_time];
                }
                Util.getTbTime();
            }
        }
    },
    /**
     * 抢购成功啦！
     */
    qgSuccess:function(tabId){
        let currentQgList = Util.qgList[Util.currentQgKey];
        if (!currentQgList) {
            return;
        }

        //跟购物车结算的tab是一个的话 代表全部抢购结算
        if (tabId == Util.openCartabTd) {
            
            let num_iidArr = [];
            for (let num_iid in currentQgList) {
                if (currentQgList[num_iid]['tab']) {
                    num_iidArr.push(num_iid);
                    try {
                        chrome.tabs.remove(currentQgList[num_iid]['tab']);
                    } catch (e) {
                        // 关闭失败
                        console.log("关闭tab失败",currentQgList[num_iid]['tab']);
                    }
                    
                }
            }

            $.get(Host+'/coupon/qgSuccess',{num_iid:num_iidArr.join(','),tb_id:TB_ID,user_token:USER_TOKEN,user_fd:WSFD},function (d) {
                //关闭tab
                console.log("批量提交",d);
                if (d.status ==1){
                    Util.notice(d.data);
                }
                setTimeout(function () {
                    chrome.tabs.remove(tabId);
                },10000);
            });
        } else {
            for (let num_iid in currentQgList) {
                if (currentQgList[num_iid]['tab'] == tabId) {
                    //付款成功！！！
                    console.log("num_iid",num_iid,'tabid',tabId,"付款成功","删除队列");
                    delete Util.delQgList(num_iid);
                    $.get(Host+'/coupon/qgSuccess',{num_iid:num_iid,tb_id:TB_ID,user_token:USER_TOKEN,user_fd:WSFD},function (d) {
                        //关闭tab
                        console.log("准备关闭tab",tabId);
                        if (d.status ==1){
                            Util.notice(d.data);
                        }
                        setTimeout(function () {
                            try {
                                chrome.tabs.remove(tabId);
                            } catch (e) {
                                console.log('关闭tab失败');
                            }
                        },10000);

                    });
                    break;
                }
            }
        }

        if (Object.keys(currentQgList).length == 0) {
            //删除当前时间的抢购列表
            delete Util.qgList[Util.currentQgKey];
        }
    },
    /**
     * websocket发送数据
     * @param data {class:'',action:'',content:data}
     */
    wsSend:function (data) {
        //判断ws是否连接ok
        if (!WS) {
            console.log('WS对象为空');
            return ;
        }
        data['content']['user_token'] = USER_TOKEN;
        WS.send(JSON.stringify(data));
    },
    getGY:function (data,async) {
        data['user_token'] = USER_TOKEN;
        $.ajax({
            url:Host+'/coupon/gy',
            method:'POST',
            data:data,
            async:async,
            dataType:'json',
            timeout:1000,
            success:function (d) {
                if (d != -1 && d.item_url){
                    sessionStorage[data.num_iid] = JSON.stringify(d);
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }
            }
        });
    },
    noticeUrl:null,
    notice : function (data) {
        if (chrome.notifications)  {

            var NotifyId = "item"+Math.ceil(Math.random()*100);
            chrome.notifications.create(NotifyId, data.option , function (NotifyId) {
                Util.noticeUrl = data.url;
            });
            // chrome.notifications.clear(NotifyId, function(wasCleared){
            //     console.log('通知关闭');
            //     if (wasCleared) {
            //         localStorage.removeItem(NotifyId);
            //     }
            // }); //自内存清除弹窗提示
        } else {
            console.log("open show");
            var show=window.webkitNotifications.createNotification(chrome.runtime.getURL("icon19.png"),data.content, "" );
            show.onclick = function() {
                window.open(data.url);
            }
        }
    },
    initQgList:function(list) {
        for(let i in list) {
            list[i]['start_time'] *= 1000;
            Util.pushQgInfo(list[i],true);
        }
    },
    pushQgInfo:function(qgInfo,flag){
        sessionStorage['qg_'+qgInfo.num_iid] = JSON.stringify(qgInfo);

        //加入变量队列
        if (!Util.qgList[qgInfo['start_time']]) {
            Util.qgList[qgInfo['start_time']] = {};
        }
        Util.qgList[qgInfo['start_time']][qgInfo.num_iid] = qgInfo;
        if(!flag){
            Util.getTbTime();
        }
    },
    //获取用户未抢购成功的商品列表
    getMyQgItem:function () {
        $.ajax({
            url:Host+'/coupon/getMyQgItem',
            data:{user_token:USER_TOKEN},
            dataType:'json',
            timeout:2500,
            success:function (d) {
                if (d.status == 1) {
                    Util.initQgList(d.data.data);
                    Util.setBadge(d.data.count);
                   Util.getTbTime();
                }

            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }
            }
        });

    },
    setBadge:function (txt) {
        chrome.browserAction.setBadgeText({text: txt+''});
        chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
    },
    setTbId:function (tbId) {
        $.get(Host+'/user/upUserTbId',{tb_id:tbId,user_token:USER_TOKEN},function (d) {
            TB_ID = tbId;
            console.log(d);
        });
    },
    getRecommendQuan:function (url) {
        $.ajax({
            url:url,
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('mtopjsonp3(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.recommend && d.data.recommend.resultList) {
                        d = d.data.recommend.resultList;
                        let quanArr = [];
                        for (let i in d) {
                            let quan = {
                                num_iid:d[i].itemId,
                                activity_id:d[i].couponActivityId,
                                amount:d[i].couponAmount,
                                start_time:d[i].couponEffectiveStartTime/1000,
                                end_time:d[i].couponEffectiveEndTime/1000,
                                star_fee:d[i].couponStartFee
                            };
                            quanArr.push(quan);
                        }
                        Util.addQuan(quanArr);
                    }
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    },
    addQuan:function (quan,one) {
        $.ajax({
            url:Host+'/quan/add',
            method:'POST',
            data:{data:quan,one:one?one:''},
            dataType:'json',
            timeout:2500,
            success:function (d) {
                if (d.status == 1) {
                    console.log("添加券成功");
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }
            }
        });
    },
    getErQuan:function (url) {
        $.ajax({
            url:url,
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('mtopjsonp2(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.success) {
                        d = d.data.result;
                        let quan = {
                            num_iid:d.item.itemId,
                            amount:d.amount,
                            start_time:d.effectiveStartTime,
                            end_time:d.effectiveEndTime,
                            star_fee:d.startFee
                        };
                        let reg=/"activityId"%3A"(.*)"%2C"/m;
                        url = decodeURI(url);
                        let act = url.match(reg);
                        console.log(act);
                        if (act && act[1]) {
                            quan['activity_id'] = act[1];
                            if(quan['start_time'] && quan['end_time']) {
                                quan['start_time'] =  Date.parse(new Date(quan['start_time'])) / 1000;
                                quan['end_time'] =  Date.parse(new Date(quan['end_time'])) / 1000;
                            }
                            Util.addQuan([quan]);
                        } else {
                            quan['url'] = d.item.shareUrl;
                            Util.addQuan(quan,true);
                        }

                    }
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    },
    //获取阿里妈妈券
    getSellerQuan:function(url){
        $.ajax({
            url:url,
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('mtopjsonp1(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.success) {
                        d = d.data.result;
                        let quan = {
                            amount:d.amount,
                            start_time:d.effectiveStartTime,
                            end_time:d.effectiveEndTime,
                            star_fee:d.startFee
                        };

                        url = decodeURI(url);

                        let sel = url.match(/data={"sellerId"%3A"(\d+)"%2C"activityId"%3A"(\w+)"%2C/m);
                        console.log(url,sel);
                        if (sel && sel[1]) {
                            quan['seller'] = sel[1];
                            quan['activity_id'] = sel[2];
                        }
                        // if(quan['start_time'] && quan['end_time']) {
                        //     quan['start_time'] =  Date.parse(new Date(quan['start_time'])) / 1000;
                        //     quan['end_time'] =  Date.parse(new Date(quan['end_time'])) / 1000;
                        // }
                        Util.addQuan(quan,1);

                    }
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    },
    changeTbSku:function (url,tabId) {
        
    },
    tbAddCar:{},
};

if (chrome.notifications) {
    chrome.notifications.onButtonClicked.addListener(function(NotifyId,c) {
        chrome.tabs.create({url:Util.noticeUrl}, tab => {
            console.log("todo in tab");
            //todo 记录是哪个用户推送来的 增加点击量
        });
    });
    chrome.notifications.onClicked.addListener(function(NotifyId) {
        chrome.tabs.create({url:Util.noticeUrl}, function(){
            console.log("todo in tab");
            //todo 记录是哪个用户推送来的 增加点击量
        });
    });
}
    /**
 * 与conten_script通信 与服务端通信
 */
chrome.extension.onRequest.addListener(function(r, sender, sendResponse){
    console.log(r);
    switch (r.type) {
        case 'getPopupData':
            r.param['user_token'] = USER_TOKEN;
            $.ajax({
                url:Host+'/'+r.action,
                data:r.param,
                dataType:'json',
                timeout:2500,
                method:r.method?r.method:'GET',
                success:function (d) {
                    if(d.status ==-1) {
                        d.data['user_token'] = USER_TOKEN;
                        d.data['user_fd'] = WSFD;
                    }
                    sendResponse(d);
                },
                error:function (xhr,status,error) {
                    console.log("错误提示： " + xhr.status + " " + xhr.statusText);
                },
                complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                    if(status == 'timeout'){
                        console.log("请求超时，请稍后再试！",'','error');
                    }
                }
            });
            break;
        case 'getGYCouponUrl':
            if (!sessionStorage[r.data.num_iid]) {
                Util.getGY(r.data, true);
            }
            let coupon = JSON.parse(sessionStorage[r.data.num_iid]);
            sendResponse({coupon_url:coupon.coupon_click_url});
            break;
        //解析click url 跳转后的302 location
        case 'getClickUrl':
            if (sessionStorage[r.data.num_iid]) {
                return;
            }
            Util.getGY(r.data, true);
           break;
           //获取当前商品是否在抢购列表中
        case 'getLocalQgItemById':
            //Util.checkQuan();
            sendResponse({info:sessionStorage['qg_'+r.id], systemTime:Util.systemTime, jhs_num_iid:Util.jhsNumIid,pageStime:sessionStorage['tab_stime'+r.id]});
            break;
            //加入抢购队列
        case 'addQgList':
            //能加入抢购 就说明打开了聚划算页面
            $.ajax({
                url:Host+'/coupon/addQgList',
                method:'POST',
                data:{qgInfo:r.qgInfo,itemInfo:r.itemInfo,user_token:USER_TOKEN},
                dataType:'json',
                timeout:1000,
                success:function (d) {
                    if (d.status == 1){
                        r.qgInfo['num_iid'] = r.id;
                        Util.pushQgInfo(r.qgInfo);
                        Util.setBadge(d.data['count']);
                        console.log("加入了抢购队列",r.id);
                    }
                    d.data['user_token'] = USER_TOKEN;
                    d.data['user_fd'] = WSFD;
                    sendResponse(d);
                },
                error:function (xhr,status,error) {
                    console.log("错误提示： " + xhr.status + " " + xhr.statusText);
                },
                complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                    if(status == 'timeout'){
                        console.log("请求超时，请稍后再试！",'','error');
                    }
                }
            });
            break;
        case 'cancelQgList':
            $.ajax({
                url:Host+'/coupon/cancelQgList',
                data:{num_iid:r.id,user_token:USER_TOKEN},
                dataType:'json',
                timeout:1000,
                success:function (d) {
                    if (d.status == 1){
                        Util.setBadge(d.data.count);
                        Util.delQgList(r.id);
                        console.log("取消了抢购队列",r.id);
                        sendResponse(d);
                    }
                },
                error:function (xhr,status,error) {
                    sendResponse(0);
                    console.log("错误提示： " + xhr.status + " " + xhr.statusText);
                },
                complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                    if(status == 'timeout'){
                        console.log("请求超时，请稍后再试！",'','error');
                    }
                }
            });
            break;
            //给购物车页面返回当前抢购的num_iids
        case 'getCurrenQgNumIids':
            sendResponse(Object.keys(Util.qgList[Util.currentQgKey]).join(','));
            break;
        case 'qgBegin':
            Util.qgList[Util.currentQgKey][r.id]['title'] = r.title ? r.title:'';
            Util.currentQgSucNum++;
            let keyarr = Object.keys(Util.qgList[Util.currentQgKey]);
            if (Util.openCartabTd && Util.currentQgSucNum >= keyarr.length) {
                let qgTitle = [],nowQg=Util.qgList[Util.currentQgKey];
                for (let s in nowQg){
                    if (nowQg[s].title) qgTitle.push(nowQg[s].title);
                }
                chrome.tabs.sendRequest(Util.openCartabTd,
                    {num_iids:keyarr,qg_title:qgTitle,jhs_num_iid: Util.jhsNumIid,start_time:Util.currentQgKey},
                    r => {
                        console.log('刷新购物车开始提交start_time='+Util.timestampToTime(Util.currentQgKey));
                    });
            }
            break;
        case 'mustLogin':
            Util.loginTb();
            break;
        case 'upTbId':
            Util.setTbId(r.data);
        case 'getQuan':
            $.ajax({
                url:Host+'/quan/getQuan',
                data:{num_iid:r.data.num_iid,seller:r.data.seller,user_token:USER_TOKEN},
                dataType:'json',
                timeout:1000,
                success:function (d) {
                    sendResponse(d);
                },
                error:function (xhr,status,error) {
                    sendResponse(0);
                    console.log("错误提示： " + xhr.status + " " + xhr.statusText);
                },
                complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                    if(status == 'timeout'){
                        console.log("请求超时，请稍后再试！",'','error');
                    }
                }
            });
            break;
        case 'getCarSubmitTime':
            let num_iidArr = Object.keys(Util.qgList[Util.currentQgKey]);
            let qgTitle = [],nowQg=Util.qgList[Util.currentQgKey];
            for (let s in nowQg){
                if (nowQg[s].title) qgTitle.push(nowQg[s].title);
            }

            sendResponse({num_iids:num_iidArr,qg_title:qgTitle,jhs_num_iid: Util.jhsNumIid,start_time:Util.currentQgKey});
            break;
        case 'lqSellerQuan':
            document.cookie = r.data.cookie;
            $.ajax({
                url:r.data.url,
                method:'GET',
                dataType:'text',
                timeout:1000,
                success:function (d) {
                    if (d.indexOf('jsonp703(')!=-1){
                        d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                        console.log("领券成功",d);
                        sendResponse(d);
                    }
                },
                error:function (xhr,status,error) {
                    console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
                }
            });
            break;
        default:
            break;
    }
});
// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking ["<all_urls>"]
chrome.webRequest.onBeforeRequest.addListener(details => {
    console.log(details);
    //阿里妈妈券
    if(details.url.indexOf("acs.m.taobao.com/h5/mtop.alimama.union.hsf.mama.coupon.get") != -1) {
        console.log("二合一券推荐页面",details.tabId);
        Util.getSellerQuan(details.url);
        return;
    }
    //搜罗优惠券连接
    if(details.url.indexOf("acs.m.taobao.com/h5/mtop.alimama.union.xt.en.api.entry") != -1) {
        console.log("二合一券",details.tabId);
        Util.getRecommendQuan(details.url);
        return;
    }
    //优惠券页面
    if(details.url.indexOf("mclient.alipay.com/h5/cashierPay.htm") != -1) {
        console.log("支付完成",details.tabId);
        Util.qgSuccess(details.tabId);
        return;
    }
    if (details.url.indexOf('acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get') != -1) {
        Util.getErQuan(details.url);
        return;
    }

    if(details.type == 'main_frame') {
        //宝贝页面 先获取商品id
        var id = details.url.match(/[\?&]id=(\d{8,15})/);
        if (id) {
            id = id[1];
        }
        //判断跳转详情页面时不是自己的pid 就替换掉
        if (details.url.indexOf('mm_119948269') == -1) {
            if (details.initiator == 'https://s.click.taobao.com') {
                return;
            }
            if (sessionStorage['tab_'+id] && sessionStorage['tab_'+id] == details.tabId) {
                console.log("刷新当前页操作");
                //表示刷新当前页面 并且 已经跳转过高佣连接而来
                return;
            }
            //如果没有商品id做key的session 表示没有生成高佣跳转链接
            if (!sessionStorage[id]) {
                //以同步的方式生成高佣后再继续往下执行
                Util.getGY({num_iid:id}, false);
                if (!sessionStorage[id]) {
                    //如果 这个商品是抢购商品的话 直接跳往用户选择好的sku连接 若是直接跳往手机端的连接 就走 src_url
                    if (sessionStorage['qg_'+id]) {
                        if (details.url.indexOf("//detail.m.") != -1 || details.url.indexOf('h5.m.taobao.com/awp/core/detail') != -1
                        ||details.url.indexOf("decision=cart") != -1) {
                            console.log("-1 走这里手机抢购");
                            return;
                        }
                        let qgInfo = JSON.parse(sessionStorage['qg_'+id]);
                        console.log("-1 走这里");
                        return {redirectUrl: qgInfo.url};
                    }
                    return;
                }
            }
            //json 解析出高佣链接item_url
            var data = JSON.parse(sessionStorage[id]);
            if (data && data.item_url) {
                //暂存之前过来的原链接 在高佣链接跳转后再劫持 改为此链接 之后删除
                sessionStorage['src_url_'+id] = details.url;
                //记录好高佣跳转成功的tabid 方便用户刷新时 不在跳转高佣链接
                sessionStorage['tab_'+id]=details.tabId;
                Util.tabNumIidCache[details.tabId] = id;
                return {redirectUrl: data.item_url};
            }
        } else if(sessionStorage['tab_'+id]) {
            //这里处理得是用户从高佣跳转后造成的页面跳转失败问题
            let url = sessionStorage['src_url_'+id];
            //如果 这个商品是抢购商品的话 直接跳往用户选择好的sku连接 若是直接跳往手机端的连接 就走 src_url
            if (sessionStorage['qg_'+id] &&
                (url.indexOf("//detail.m.") == -1 && url.indexOf('h5.m.taobao.com/awp/core/detail') == -1 &&
                    url.indexOf('decision=cart') == -1)) {
                let qgInfo = JSON.parse(sessionStorage['qg_'+id]);
                url = qgInfo.url;
                console.log('跳转_qg_url',url,details.url,sessionStorage['src_url_'+id]);
            } else {
                console.log('跳转_src_url',url,details.url,sessionStorage['src_url_'+id]);
            }
            sessionStorage.removeItem('src_url_'+id);
            sessionStorage['tab_stime'+id] = new Date().getTime();
            return {redirectUrl: url};
        }
    }

}, {
    urls: [
        "*://detail.tmall.com/item.htm*",
        "*://detail.m.tmall.com/item.htm*",
        "*://chaoshi.detail.tmall.com/item.htm*",
        "*://item.taobao.com/item.htm*",
        "*://h5.m.taobao.com/awp/core/detail*",
        "*://acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get*",
        "*://mclient.alipay.com/h5/cashierPay.htm*",
        "*://acs.m.taobao.com/h5/mtop.alimama.union.xt.en.api.entry*",
        "*://acs.m.taobao.com/h5/mtop.alimama.union.hsf.mama.coupon.get*"//seller券
    ],
    types:["main_frame","other","script"]
}, ["blocking"]);

// chrome.webRequest.onBeforeSendHeaders.addListener(details => {
//     let ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Mobile Safari/537.36';
//         for (var i = 0; i < details.requestHeaders.length; ++i) {
//             if (details.requestHeaders[i].name === 'User-Agent') {
//                 details.requestHeaders[i].value = ua;
//                 break;
//             }
//         }
//         console.log('details.requestHeaders',details.requestHeaders);
//         return {requestHeaders: details.requestHeaders};
// },{urls:["*://maliprod.alipay.com/w/trade_pay.do*","*://maliprod.alipay.com/batch_payment.do*"],
//     types:['main_frame']},
//     ['blocking','requestHeaders']);

//监听tab关闭
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log("侦听到tab 关闭了",tabId ,Util.proofTabId,removeInfo);
    if (tabId == Util.proofTabId) {
        Util.proofTabId = 0;
        console.log("清理Util.proofTabId",Util.proofTabId);
    }
    if(tabId == Util.quanUrlTabId) {
        Util.quanUrlTabId = 0;
    }
    if(tabId == Util.loginTbId) {
        Util.loginTbId = 0;
    }

    if (tabId == Util.openCartabTd) {
        Util.openCartabTd = 0;
        console.log("清理Util.openCartabTd",Util.openCartabTd);
    }
    //如果tab cache中存有num_iid 则把 tab_num_iid 的缓存清理 防止下次打开报错
    if (Util.tabNumIidCache[tabId]) {
        let id = Util.tabNumIidCache[tabId];
        if (sessionStorage['tab_'+id] != tabId) {
            try{
                chrome.tabs.remove(sessionStorage['tab_'+id]);
            } catch (e) {
                console.log('清除无用tab出异常');
            }
        }
        sessionStorage.removeItem('tab_'+id);
        console.log("清理tab_id",'tab_'+id);
    }
});
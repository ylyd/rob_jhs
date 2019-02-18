//webSocket
var WS = null,Host = 'http://es.com',WSFD = 0,
    //上次连接的旧的websocket fd
    WS_OLD_FD = localStorage['WS_OLD_FD'] ? localStorage['WS_OLD_FD'] : 0,USER_TOKEN = null;
chrome.storage.sync.get('user_token', function(r) {
    if (r && r['user_token']) {
        //把用户token 付给变量
        if (r['user_token']) {
            USER_TOKEN = r['user_token'];
        }
    }
});
try {
     WS = new ReconnectingWebSocket('ws://es.com:9501', null, {debug: true, reconnectInterval: 300000});

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
                localStorage['WS_OLD_FD'] = data.fd;
                //获取带抢购列表
                Util.getMyQgItem();
                Util.setUserToken(data.user_token);
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

/**
 * 工具类
 * @type {{wsSend: Util.wsSend}}
 */
var Util = {
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
    //定时检查抢购队列
    checkQg : function(){
        let sTime = new Date().getTime();
        let lazyTime = 20000;
        for(let stime in Util.qgList) {
            let cha = stime*1 - Util.systemTime;
            let nowStimeList = Util.qgList[stime];
            let keyArr = Object.keys(nowStimeList);
            //准备打开页面抢购 进入抢购页面 尽量不要太多
            if (cha <= (keyArr.length + 1) * lazyTime) {
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
                    if (url.indexOf('item.taobao.com/item') != -1) {
                        //判断是淘宝的商品
                        url = 'https://h5.m.taobao.com/awp/core/detail.htm?'+(url.split('?')[1]);
                    } else {
                        url = url.replace(/:\/\/.*detail./,'://detail.m.');
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
            }

            if (keyArr.length>0) {
                Util.currentNumIid = keyArr[0];
            }
        }
        let eTime = new Date().getTime();
        Util.systemTime = Util.systemTime * 1 + lazyTime + (eTime - sTime);
        //lazyTime秒检测一次 相当于lazyTime 秒后打开一个抢购的商品
        setTimeout(Util.checkQg, lazyTime);
    },
    //定时器标识
    qgPageOpenOnceTime:3*60*1000,
    //重置心跳包
    getTbTime:function(){
        var qgKeyArr = Object.keys(Util.qgList);
        if (qgKeyArr.length == 0 || !Util.currentNumIid) {
            console.log('已经全部抢购完毕，列表为空');
            setTimeout(Util.getTbTime,Util.qgPageOpenOnceTime);
            return;
        }
        let jhsNowTimeInfoUrl = 'https://dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+Util.currentNumIid;
        var sTime = new Date().getTime();
        $.ajax({
            url:jhsNowTimeInfoUrl,
            dataType:'json',
            success:function (d) {
                if (d && d.data) {
                    //登录淘宝 跟时间校验 有要抢的宝贝 且 当前时间<= 抢购时间 且 当前时间 >= 抢购时间-两（防止漏掉）个轮训时间
                    let minStime = Util.arrayMin(qgKeyArr);

                    if (d.data.isLogin == 0 && minStime &&
                        d.data.time <= minStime && d.data.time >= minStime - 2 * Util.qgPageOpenOnceTime) {
                        console.log("这个时间需要淘宝登录");
                        //todo 提示登录
                        Util.loginTb();
                    }
                    let eTime = new Date().getTime();
                    Util.systemTime = d.data.time*1 + (eTime-sTime);
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }
                setTimeout(Util.getTbTime,Util.qgPageOpenOnceTime);
            }
        });
    },
    arrayMin:function(arrs){
        let min = arrs[0];
        for(let i = 1; i < arrs.length; i++) {
            if(arrs[i] < min) {
                min = arrs[i];
            }
        }
        return min;
    },
    loginTb:function(){
        chrome.storage.sync.get('tb_info', function(r) {
            if(r && r['tb_info']) {
                let loginInfo = r['tb_info'];
                if (loginInfo.tb_username && loginInfo.tb_password) {
                    chrome.tabs.create({
                        url:'https://login.m.taobao.com/login.htm?loginFrom=wap_tmall',
                        index:0,
                        selected:false
                    }, tab => {
                        console.log("tab",tab);
                        setTimeout(function () {
                            chrome.tabs.remove(tab.id);
                        },5000);
                    });
                }
            }
        });
    },
    delQgList:function(id){
        let qgInfo = localStorage['qg_'+id];
        localStorage.removeItem('qg_'+id);
        //删除变量队列
        if (qgInfo) {
            qgInfo = JSON.parse(qgInfo);
            if (Util.qgList[qgInfo.startTime] && Util.qgList[qgInfo.startTime][id]) {
                delete Util.qgList[qgInfo.startTime][id];
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
        for (let num_iid in currentQgList) {
            if (currentQgList[num_iid]['tab'] == tabId) {
                //付款成功！！！
                console.log("num_iid",num_iid,'tabid',tabId,"付款成功","删除队列");
                delete Util.delQgList(num_iid);
                $.get(Host+'/coupon/qgSuccess',{num_iid:num_iid,user_token:USER_TOKEN},function (d) {
                    //关闭tab
                    console.log("准备关闭tab",tabId);
                    setTimeout(function () {
                        chrome.tabs.remove(tabId);
                    },10000);

                });
                continue;
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
    //更新优惠券
    upCoupon:function (data) {
        data['user_token'] = USER_TOKEN;
        $.ajax({
            url:Host+'/coupon/update',
            method:'POST',
            data:data,
            dataType:'json',
            timeout:1000
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
    //获取用户未抢购成功的商品列表
    getMyQgItem:function () {
        Util.checkQg();
        Util.getTbTime();
    },
    setBadge:function (txt) {
        chrome.browserAction.setBadgeText({text: txt+''});
        chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]});
    }
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
        //解析click url 跳转后的302 location
        case 'getClickUrl':
            if (sessionStorage[r.data.num_iid]) {
                return;
            }
            Util.getGY(r.data, true);
           break;
           //获取当前商品是否在抢购列表中
        case 'getLocalQgItemById':
            sendResponse({info:localStorage['qg_'+r.id], systemTime:Util.systemTime,pageStime:sessionStorage['tab_stime'+r.id]});
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
                        localStorage['qg_'+r.id] = JSON.stringify(r.qgInfo);
                        Util.setBadge(d.data['count']);
                        //加入变量队列
                        if (!Util.qgList[r.qgInfo.startTime]) {
                            Util.qgList[r.qgInfo.startTime] = {};
                        }
                        Util.qgList[r.qgInfo.startTime][r.id] = r.qgInfo;
                        console.log("加入了抢购队列",r.id);
                    }
                    d.data['user_token'] = USER_TOKEN;
                    sendResponse(d);
                },
                error:function (xhr,status,error) {
                    console,log("错误提示： " + xhr.status + " " + xhr.statusText);
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
                        Util.setBadge(d.data);
                        Util.delQgList(r.id);
                        console.log("取消了抢购队列",r.id);
                        sendResponse(1);
                    }
                },
                error:function (xhr,status,error) {
                    sendResponse(0);
                    console,log("错误提示： " + xhr.status + " " + xhr.statusText);
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
            let time = new Date();
            console.log(time.getHours()+':'+time.getMinutes()+':'+time.getSeconds()+'打开了手机页面进行购买',r.id,r.systemTime - Util.systemTime);
            break;
        case 'mustLogin':
            Util.loginTb();
            break;
    }
});
// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking ["<all_urls>"]
chrome.webRequest.onBeforeRequest.addListener(details => {
    console.log(details);
    //优惠券页面
    if(details.url.indexOf("mclient.alipay.com/h5/cashierPay.htm") != -1) {
        console.log("支付完成",details.tabId);
        Util.qgSuccess(details.tabId);
        return;
    }
    if (details.url.indexOf('acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get') != -1) {
        $.ajax({
            url:details.url,
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('mtopjsonp2(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.success) {
                        d = d.data.result;
                        var id = d.item.itemId;
                        sessionStorage['coupon_'+id] = d.amount;
                        //上传优惠券 无论失效与否
                        Util.upCoupon(d);
                    }
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    } else if(details.type == 'main_frame') {
        //宝贝页面 先获取商品id
        var id = details.url.match(/[\?&]id=(\d{8,15})/);
        if (id) {
            id = id[1];
        }
        //判断跳转详情页面时不是自己的pid 就替换掉
        if (details.url.indexOf('mm_119948269') == -1) {

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
                    if (localStorage['qg_'+id]) {
                        if (details.url.indexOf("//detail.m.") != -1 || details.url.indexOf('h5.m.taobao.com/awp/core/detail') != -1) {
                            console.log("-1 走这里手机抢购");
                            return;
                        }
                        let qgInfo = JSON.parse(localStorage['qg_'+id]);
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
            if (localStorage['qg_'+id] &&
                (url.indexOf("//detail.m.") == -1 && url.indexOf('h5.m.taobao.com/awp/core/detail') == -1)) {
                let qgInfo = JSON.parse(localStorage['qg_'+id]);
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
    urls: ["*://detail.tmall.com/item.htm*","*://detail.m.tmall.com/item.htm*","*://chaoshi.detail.tmall.com/item.htm*",
        "*://item.taobao.com/item.htm*","*://h5.m.taobao.com/awp/core/detail*",
    "*://acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get*","*://mclient.alipay.com/h5/cashierPay.htm*"],
    types:["main_frame","other","script"]
}, ["blocking"]);

//监听tab关闭
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log("侦听到tab 关闭了",tabId ,Util.proofTabId,removeInfo);
    if (tabId == Util.proofTabId) {
        Util.proofTabId = 0;
        console.log("清理Util.proofTabId",Util.proofTabId);
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
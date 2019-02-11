var qgUrl = window.location.href;
var qgId = qgUrl.match(/id=(\d{5,20})/);
if (qgId && qgId[1]) {
    qgId = qgId[1];
}
//获取抢购的信息
var qgInfo = null;
chrome.extension.sendRequest({type: "getLocalQgItemById", id:qgId}, function(r){
    if(r){
        qgInfo = JSON.parse(r);
    }
});
$(function () {
    let id = qgId;

    let jhsItemInfoUrl = '//h5api.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?jsv=2.4.8&appKey=12574478&t='+(new Date().getTime())+'&sign=c4c5abe87a1c0743b85c0bba3f44b632&api=mtop.taobao.detail.getdetail&v=6.0&callback=mtopjsonp4&ttid=2017%40taobao_h5_6.6.0&AntiCreep=true&data=%7B%22itemNumId%22%3A%22'+id+'%22%7D';
    var sTime = new Date().getTime();
    var qgDomParent = null,qgDomParentId = "#J_ButtonWaitWrap";
    $.ajax({
        url:jhsItemInfoUrl,
        method:'GET',
        dataType:'text',
        timeout:1000,
        success:function (d) {
            var eTime = new Date().getTime();
            console.log(eTime,sTime,eTime-sTime);
            if (d.indexOf('mtopjsonp4(')!=-1){
                d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.apiStack && d.data.apiStack[0]) {
                    var info = JSON.parse(d.data.apiStack[0].value);
                    console.log('info',info);
                    countDown.lazyTimeArr.push(eTime-sTime);
                    if (info.vertical.jhs) {
                        info = {
                            endTime:info.vertical.jhs.endTime,
                            startTime:info.vertical.jhs.startTime,
                            systemTime:info.otherInfo.systemTime*1 + (eTime-sTime)
                        };
                        console.log('jhs2',info);

                        // 2.检查是否聚划算 可已抢购
                        // a.根据开始时间 结束时间 当前时间
                        // b. 当前时间 < 开始时间 加入抢购 选择购买的属性 加入成功 显示倒计时
                        // c. 开始时间 <= 当前时间 <= 结束时间 如果已经加入抢购时 立即抢购 进入h5页面

                        //未开始
                        if (info.systemTime < info.startTime) {
                            //已经加入抢购
                            if(qgInfo) {
                                //todo 选中对应的sku
                                //显示倒计时
                            } else {
                                //插入点击加入抢购的按钮
                                countDown.go(info);
                            }
                        } else if(qgInfo) {
                            //立即抢
                        }
                    }
                }
            }
        },
        error:function (xhr,status,error) {
            console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
        }
    });

    //显示倒计时

    var countDown = {
        lazyTimeArr:[],
        info: null,
        downTimeDom:null,
        kqBtn:null,
        init:function(){
            //获取 插件插入内容的父dom
            qgDomParent = $(qgDomParentId);
            if(!qgDomParent.get(0)) {
                return;
            }
            qgDomParent.html('<span id="qg_down_time"></span><a id="kaiqiang_btn"></a><div class="tb-clear"></div>');
            countDown.downTimeDom = qgDomParent.find('#qg_down_time');
            countDown.kqBtn = qgDomParent.find("#kaiqiang_btn");
            qgDomParent.before('<div id="qg_info_alert" class="alert alert-danger">' +
                '请在虚线框中选择好 <strong>属性</strong> 跟 <strong>够买数量</strong> 在继续加入抢购！</div>');
            var qgInfoAlert = $("#qg_info_alert");

            if(qgInfo) {
                countDown.kqBtn.text("取消定时抢购");
            } else {
                countDown.kqBtn.text("加入定时抢购");
            }
            var prop = $(".tb-sku .tb-prop .J_TSaleProp");
            prop.on('click','li', function () {
                let o = $(this);
                if(!o.hasClass('tb-out-of-stock')) {
                    o.closest('.tb-prop').removeClass('place-select-prop');
                }
            });
            countDown.kqBtn.click(function () {
                let txt = countDown.kqBtn.text();
                if (txt == "加入定时抢购") {
                    //todo 跟bg.js通信 把商品信息传入 成功后改变文字
                    //检测sku是否全部选中
                    var propSelectFlag = false;
                    prop.each(function (i,v) {
                        let o = $(v);
                        if(!o.find('li.tb-selected').get(0)) {
                            propSelectFlag = true;
                            o.closest('.tb-prop').addClass('place-select-prop');
                        } else {
                            o.closest('.tb-prop').removeClass('place-select-prop');
                        }
                    });
                    if (propSelectFlag) {
                        //todo 提示
                        qgInfoAlert.show(100);
                        return;
                    }
                    qgInfoAlert.hide(100);
                    countDown.kqBtn.text("取消定时抢购");
                } else{
                    countDown.kqBtn.text("加入定时抢购");
                }
            });
        },
        go : function (info) {
            this.init();
            this.info = info;
            this.timeDown();
            this.proof();
        },
        // 时间倒计时
        timeDown : function () {
            let cha = countDown.info.startTime - countDown.info.systemTime,
                leftTime = parseInt(cha / 1000);//获得时间差

            if(!qgDomParent.get(0)) {
                countDown.init();
            } else {
                //小时、分、秒需要取模运算
                let d = parseInt(leftTime/86400),
                    h = parseInt(leftTime/3600%24),
                    m = parseInt(leftTime/60%60),
                    s = parseInt(leftTime%60),
                    ms = parseInt((cha / 100)%10),
                    txt = "开抢：";
                if (d) {
                    txt += d+"天";
                }
                if (h) {
                    txt += h+"小时";
                }
                if (m) {
                    txt += m+"分";
                }
                txt += s + "秒" + ms;
                countDown.downTimeDom.text(txt);

            }

            if(cha <= 1000){
                //todo 开始抢购
                if (qgInfo) {
                    location.href=qgInfo.url;
                    return;
                }
            }
            countDown.info.systemTime = countDown.info.systemTime*1 + 100;
            setTimeout(countDown.timeDown,100);
        },
        //每60s校对一次时间 并且判断是否掉线
        proof:function () {
            let jhsNowTimeInfoUrl = '//dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+id;
            var sTime = new Date().getTime();
            $.getJSON(jhsNowTimeInfoUrl, function (d) {
                console.log('jhs',d);
                if (d) {
                    let eTime = new Date().getTime();
                    countDown.lazyTimeArr.push(eTime-sTime);
                    countDown.info.systemTime = d.data.time*1 + (eTime-sTime);
                    countDown.lazyTimeArr.push(eTime-sTime);
                    if (!d.data.isLogin) {
                        //todo 提示登录
                    }
                }
                setTimeout(countDown.proof,1000*60);
            });
            console.log("countDown.lazyTimeArr",countDown.lazyTimeArr);
            //随机弹出
            if (countDown.lazyTimeArr.length>20){
                let index = Math.floor(Math.random()*countDown.lazyTimeArr.length);
                countDown.lazyTimeArr.splice(index,1);
            }
        }
    }


});
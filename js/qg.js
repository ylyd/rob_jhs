;(function ($) {
    let qgUrl = window.location.href;
    let qgId = qgUrl.match(/id=(\d{5,20})/);
    if (qgId && qgId[1]) {
        qgId = qgId[1];
    }
    let skuId = qgUrl.match(/skuId=(\d{5,20})/);
    if (skuId && skuId[1]) {
        skuId = '&skuId='+skuId[1];
    } else {
        skuId = '';
    }
//获取抢购的信息
    let qgInfo = null,systemTime = new Date().getTime();
    $(function () {
        let isTaoBaoPage = qgUrl.indexOf('taobao.com') != -1;
        chrome.extension.sendRequest({type: "getLocalQgItemById", id:qgId}, function(r){
            console.log("输出调试",r);
            if(r && r.info){
                qgInfo = JSON.parse(r.info);
                console.log("输出调试1",qgInfo);
                let jhsNowTimeInfoUrl = '//dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+r.jhs_num_iid;
                var sTime = 0;
                $.ajax({
                    url:jhsNowTimeInfoUrl,
                    dataType:'json',
                    beforeSend:function(xhr){
                        sTime = new Date().getTime();
                    },
                    success:function (d,status,xhr) {
                        if (d && d.data) {
                            //登录淘宝 跟时间校验 有要抢的宝贝 且 当前时间<= 抢购时间 且 当前时间 >= 抢购时间-两（防止漏掉）个轮训时间

                            let eTime = new Date().getTime();
                            let tbTime = d.data.time*1;
                            systemTime = tbTime + 2;
                            let isCar = qgUrl.indexOf('decision=cart') != -1;
                            let timeArr = isCar ? [3000,6000,9000,10000,15000] : [3000,2500,2000];
                            let index = Math.floor(Math.random()*timeArr.length);

                            var timestampToTime = function(timestamp) {
                                var date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
                                Y = date.getFullYear() + '-';
                                M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
                                D = date.getDate() + ' ';
                                h = date.getHours() + ':';
                                m = date.getMinutes() + ':';
                                s = date.getSeconds();
                                return Y+M+D+h+m+s;
                            };
                            // qgInfo.start_time = qgInfo.start_time*1 + 114*60*1000;
                            let timeout = Math.max(qgInfo.start_time - systemTime - timeArr[index],1);
                            if (systemTime - qgInfo.start_time > 60000) {
                                return;
                            }
                            if (!isTaoBaoPage) {
                                $("#number").val(qgInfo.count).next('.increase').click();
                            }
                            console.log("用时",eTime-sTime,"本地时间 -淘宝时间", timestampToTime(eTime),'-',timestampToTime(tbTime),eTime - tbTime,"timeout",timeout,"抢购时间是",timestampToTime(qgInfo.start_time));
                            setTimeout(function () {
                                sTime = new Date().getTime();
                                console.log("触发时间是",timestampToTime(sTime));
                                if (isCar) {
                                    console.log("点击decision");
                                    //淘宝的加入购物车
                                    let title = '';
                                    if (isTaoBaoPage) {
                                        title = $("#J_Title .tb-main-title").attr("data-title");
                                        console.log("点击decision0");
                                        $("#J_juValid .tb-btn-add .J_LinkAdd").click();
                                    } else {
                                        $("#number").prev('.decrease').click();
                                        console.log("点击decision1");
                                        title = $('.module-title .main').text();
                                        $(".widgets-cover .footer .ok p").click();
                                    }
                                    chrome.extension.sendRequest({type: "qgBegin", id:qgId,title:title,systemTime:sTime,rtime:timeArr[index]});
                                } else {
                                    console.log("点击1");
                                    chrome.extension.sendRequest({type: "qgBegin", id:qgId,systemTime:sTime,rtime:timeArr[index]});
                                    if (isTaoBaoPage) {
                                        window.location.href = 'https://h5.m.taobao.com/cart/order.html?buildOrderVersion=3.0' +skuId+
                                            '&quantity='+qgInfo.count+'&itemId='+qgId+'&buyNow=true&exParams=%7B%22id%22%3A%22'+
                                            qgId+'%22%7D&spm=a2141.7c.buy.i0';
                                    } else {
                                        window.location.href = 'https://buy.m.tmall.com/order/confirmOrderWap.htm?enc=%E2%84%A2&itemId='+
                                            qgId+'&exParams=%7B%22etm%22%3A%22%22%7D'+skuId+'&quantity='+
                                            qgInfo.count+'&divisionCode='+qgInfo['area_id']+'&userId='+qgInfo['tb_id']+
                                            '&buyNow=true&_input_charset=utf-8&areaId='+qgInfo['area_id']+'&addressId='
                                            +qgInfo['address_id']+'&x-itemid='+qgId+'&x-uid='+qgInfo['tb_id'];
                                    }
                                }
                            },timeout);


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
            }
        });
    });
})(jQuery);

var qgUrl = window.location.href;
var qgId = qgUrl.match(/id=(\d{5,20})/);
if (qgId && qgId[1]) {
    qgId = qgId[1];
}
var skuId = qgUrl.match(/skuId=(\d{5,20})/);
if (skuId && skuId[1]) {
    skuId = '&skuId='+skuId[1];
} else {
    skuId = '';
}
//获取抢购的信息
var qgInfo = null,systemTime = new Date().getTime();
chrome.extension.sendRequest({type: "getLocalQgItemById", id:qgId}, function(r){
    console.log("输出调试",r);
    if(r && r.info){
        qgInfo = JSON.parse(r.info);
        console.log("输出调试1");
        let jhsNowTimeInfoUrl = '//dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+qgId;
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
                    console.log("用时",eTime-sTime,"本地时间 -淘宝时间", timestampToTime(eTime),'-',timestampToTime(tbTime),eTime - tbTime);
                    checkQg();
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


        let timeArr = [50,60,70,65,45];
        let index = Math.floor(Math.random()*timeArr.length);
        let lazyTime = 5;
        var checkQg = function () {
            //console.log("现在的时间",timestampToTime(systemTime));
            //如果抢购开始
            if (systemTime  >= qgInfo.start_time - timeArr[index]) {
                chrome.extension.sendRequest({type: "qgBegin", id:qgId,systemTime:systemTime,rtime:timeArr[index]});
                //表示要加入购物车
                if (qgUrl.indexOf('decision=cart') != -1) {
                    //淘宝的加入购物车
                    if (qgUrl.indexOf('h5.m.taobao.com') != -1) {
                        $(".bottom-bar .cart").click();
                    } else {
                        $(".footer .ok").click();
                    }
                } else {
                    location.href = 'https://buy.m.tmall.com/order/confirmOrderWap.htm?enc=%E2%84%A2&itemId='+
                        qgId+'&exParams=%7B%22etm%22%3A%22%22%7D'+skuId+'&quantity='+
                        qgInfo.count+'&divisionCode='+qgInfo['area_id']+'&userId='+qgInfo['tb_id']+
                        '&buyNow=true&_input_charset=utf-8&areaId='+qgInfo['area_id']+'&addressId='
                        +qgInfo['address_id']+'&x-itemid='+qgId+'&x-uid='+qgInfo['tb_id'];
                }
                return;
            } else {
                systemTime = lazyTime + systemTime*1;
                setTimeout(checkQg,lazyTime);
            }
        };
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

    }
});
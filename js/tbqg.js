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
    if(r && r.info){
        let eTime = new Date().getTime();
        let cha = eTime - systemTime;
        qgInfo = JSON.parse(r.info);
        systemTime = r.systemTime * 1 + cha;
        r.pageStime = eTime - r.pageStime;//得到页面的加载时间
        console.log(systemTime  , qgInfo.startTime,systemTime  - qgInfo.startTime);
        var checkQg = function () {
            //如果抢购开始
            if (systemTime  >= qgInfo.startTime - 2800) {
                if (qgUrl.indexOf('decision=cart') != -1) {
                    //淘宝的加入购物车
                    if (qgUrl.indexOf('h5.m.taobao.com') != -1) {
                        $(".bottom-bar .cart").click(function () {
                            console.log("触发了点击")
                        }).click();
                    } else {
                        $(".footer .ok").click(function () {
                            console.log("触发了点击")
                        }).click();
                    }
                } {
                    window.location.href = 'https://h5.m.taobao.com/cart/order.html?buildOrderVersion=3.0' +skuId+
                        '&quantity='+qgInfo.count+'&itemId='+qgId+'&buyNow=true&exParams=%7B%22id%22%3A%22'+
                        qgId+'%22%7D&spm=a2141.7c.buy.i0';
                    systemTime = 5 + systemTime;
                    setTimeout(checkQg,5);
                }

            } else {
                systemTime = 5 + systemTime;
                setTimeout(checkQg,5);
            }
        }
        checkQg();
    }
});
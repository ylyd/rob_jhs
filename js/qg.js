var qgUrl = window.location.href;
var qgId = qgUrl.match(/id=(\d{5,20})/);
if (qgId && qgId[1]) {
    qgId = qgId[1];
}
var skuId = qgUrl.match(/skuId=(\d{5,20})/);
//获取抢购的信息
var qgInfo = null,systemTime = new Date().getTime();
chrome.extension.sendRequest({type: "getLocalQgItemById", id:qgId}, function(r){
    if(r && r.info){
        let eTime = new Date().getTime();
        let cha = eTime - systemTime;
        console.log('耗时',cha);
        qgInfo = JSON.parse(r.info);
        systemTime = r.systemTime * 1 + cha;
        r.pageStime = eTime - r.pageStime;//得到页面的加载时间
        var checkQg = function () {
            //如果抢购开始
            if (systemTime  >= qgInfo.startTime - r.pageStime) {
                location.href = 'https://buy.m.tmall.com/order/confirmOrderWap.htm?enc=%E2%84%A2&itemId='+
                    qgId+'&exParams=%7B%22etm%22%3A%22%22%7D&skuId='+skuId+'&quantity='+
                    qgInfo.count+'&divisionCode=110111&userId=1031429489&buyNow=true&_input_charset=utf-8&areaId=110111&addressId=9070798277&x-itemid=586890255480&x-uid=1031429489';
            } else {
                systemTime = 5 + systemTime;
                setTimeout(checkQg,5);
            }
        }
        checkQg();
    }
});
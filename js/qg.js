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
        var checkQg = function () {
            //如果抢购开始
            if (systemTime  >= qgInfo.startTime - 220) {
                location.href = 'https://buy.m.tmall.com/order/confirmOrderWap.htm?enc=%E2%84%A2&itemId='+
                    qgId+'&exParams=%7B%22etm%22%3A%22%22%7D'+skuId+'&quantity='+
                    qgInfo.count+'&divisionCode='+qgInfo['area_id']+'&userId='+qgInfo['tb_id']+
                    '&buyNow=true&_input_charset=utf-8&areaId='+qgInfo['area_id']+'&addressId='
                    +qgInfo['address_id']+'&x-itemid='+qgId+'&x-uid='+qgInfo['tb_id'];
            } else {
                systemTime = 5 + systemTime;
                setTimeout(checkQg,5);
            }
        }
        checkQg();
    }
});
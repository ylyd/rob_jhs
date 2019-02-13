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
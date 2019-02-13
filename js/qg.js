var qgUrl = window.location.href;
var qgId = qgUrl.match(/id=(\d{5,20})/);
if (qgId && qgId[1]) {
    qgId = qgId[1];
}
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
            if (systemTime  >= qgInfo.startTime - r.pageStime * 1.5) {
                location.reload();
            } else {
                systemTime = 5 + systemTime;
                setTimeout(checkQg,5);
            }
        }
        //只要系统时间小于开抢时间就 把刷新标识删除
        if (r.systemTime >= qgInfo.startTime - r.pageStime) {
            //开抢
            console.log('开抢',systemTime,qgInfo.startTime,systemTime-qgInfo.startTime,r.pageStime);
        } else {
            //检测继续
            checkQg();
        }

    }
});
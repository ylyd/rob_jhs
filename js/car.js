var num_iidArr = sessionStorage['num_iids']?sessionStorage['num_iids'].split(','):[];
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        //sendResponse({counter: request.counter + 1 });
        sessionStorage['num_iids'] = request.join(",");
        console.log(request);
        setTimeout(function () {
            location.reload();
        },30);

    }
);

$(function () {
    if(num_iidArr.length>0) {
        for (let i in num_iidArr) {
            let d = $(".allItemv2 .item-img a[href*='id="+num_iidArr[i]+"']").closest(".item-detail");
            console.log(d.attr("data-reactid"));
                d.prev('.item-cb').find("label").click().find("input").prop("checked",true);
        }
        sessionStorage.removeItem('num_iids');
        $(".footer .btn").click();
    }
});
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
console.log(timestampToTime(new Date().getTime()),'num_iidArr',num_iidArr);
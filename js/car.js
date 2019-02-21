var num_iidArr = sessionStorage['num_iids']?sessionStorage['num_iids'].split(','):[];
chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        //sendResponse({counter: request.counter + 1 });
        sessionStorage['num_iids'] = request.join(",");
        console.log(request);
        location.reload();
    }
);

$(function () {
    if(num_iidArr.length>0) {
        for (let i in num_iidArr) {
            $(".allItemv2 .item-img a[href*='id="+num_iidArr[i]+"']").
            o.closest(".item-detail").prev('.item-cb label').click();
        }
        sessionStorage.removeItem('num_iids');
        $(".footer .btn").click();
    }
});
console.log('num_iidArr',num_iidArr);
$(function () {
    var timeFlag = null,ac = $(".order-submitOrder .action .mui-flex span");
    if (ac.get(0)) {
        ac.click();
    } else {
        timeFlag = setInterval(function () {
            ac = $(".order-submitOrder .action .mui-flex span");
            if (ac.get(0)) {
                clearInterval(timeFlag);
                ac.click();
            }
        },1);
    }
});
var num_iidArr = sessionStorage['num_iids']?sessionStorage['num_iids'].split(','):[];

var load = function(request,lazyTime) {
    sessionStorage['num_iids'] = request['num_iids'].join(",");
    let jhsNowTimeInfoUrl = '//dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+request.jhs_num_iid;
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
                let systemTime = tbTime + 2;
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
                let timeout = Math.max(request.start_time - systemTime - lazyTime,1);
                setTimeout(function () {
                    chrome.extension.sendRequest({type: "log", data:["刷新页面",timestampToTime(new Date().getTime())]});
                    location.reload();
                },timeout);
                chrome.extension.sendRequest({type: "log", data:["用时",eTime-sTime,"本地时间 -淘宝时间", timestampToTime(eTime),'-',
                        timestampToTime(tbTime),eTime - tbTime,"timeout",timeout,"抢购时间是",timestampToTime(request.start_time*1)]});


            }
        },
        error:function (xhr,status,error) {
            console.log("错误提示： " + xhr.status + " " + xhr.statusText);
            load(request);
        },
        complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数

            if(status == 'timeout'){
                console.log("请求超时，请稍后再试！",'','error');
            }

        }
    });
};
if (num_iidArr.length == 0) {
    //主动拿时间
    chrome.extension.sendRequest({type: "getCarSubmitTime"},r => {
        load(r,1000);
    });
}

chrome.extension.onRequest.addListener(
    (request, sender, sendResponse) => {
        //sendResponse({counter: request.counter + 1 });
        chrome.extension.sendRequest({type: "log", data:["收到事件 开始调用",request]});
        load(request,2000);
    }
);

$(function () {
    if(num_iidArr.length>0) {
        for (let i in num_iidArr) {
            try{
                let d = $(".allItemv2 .item-img a[href*='id="+num_iidArr[i]+"']").closest(".item-detail").prev('.item-cb');
                d.find("label").click();
                d.find("input[type=checkbox]").prop("checked",true);
                console.log(d.attr("data-reactid"));
            } catch (e) {
                
            }
            
        }
        sessionStorage.removeItem('num_iids');

        let checked = $('.item-cb input:checked');
        let da = new Date();
        chrome.extension.sendRequest({type: "log", data:["开抢点击",da.getMinutes()+":"+da.getSeconds(),"选中了",checked.length,"个"]});
        if (checked.length != num_iidArr.length) {
            console.log(checked.length, num_iidArr.length);
            // location.reload();
            return;
        }

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
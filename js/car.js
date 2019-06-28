var qgTitle = sessionStorage['qg_title']?sessionStorage['qg_title'].split(','):[];
let unique = function unique(a) {
    let seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
};

var load = function(request,lazyTime) {
    sessionStorage['qg_title'] = request['qg_title'].join(",");
    var sTime = new Date().getTime();
    chrome.extension.sendRequest({type: "getJhsTime", data:request.jhs_num_iid}, d => {
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
            let timeout = Math.max(request.start_time - systemTime - lazyTime,100);
            setTimeout(function () {
                chrome.extension.sendRequest({type: "log", data:["刷新页面",timestampToTime(new Date().getTime())]});
                location.reload();
            },timeout);
            chrome.extension.sendRequest({type: "log", data:["用时",eTime-sTime,"本地时间 -淘宝时间", timestampToTime(eTime),'-',
                    timestampToTime(tbTime),eTime - tbTime,"timeout",timeout,"抢购时间是",timestampToTime(request.start_time*1)]});


        }
    });

};
if (qgTitle.length == 0) {
    //主动拿时间
    chrome.extension.sendRequest({type: "getCarSubmitTime"},r => {
        if (r && r['qg_title']) load(r,3750);
    });
}

chrome.extension.onRequest.addListener(
    (request, sender, sendResponse) => {
        //sendResponse({counter: request.counter + 1 });
        chrome.extension.sendRequest({type: "log", data:["收到事件 开始调用",request]});
        load(request,3750);
    }
);
(function($) {
    $(function () {
        if (!sessionStorage['reload_count']) {
            sessionStorage['reload_count'] = 0;
        }
        sessionStorage['reload_count'] = sessionStorage['reload_count'] * 1 + 1;
        // if (sessionStorage['reload_count'] > 10) {
        //     sessionStorage.removeItem('reload_count');
        //     return;
        // }
        if(qgTitle.length>0) {
            for (let i in qgTitle) {
                try{
                    console.log('开始匹配');
                    // $('h1:contains("七度空间日夜组合纯棉超薄96片正品卫生巾新老包装随机发")').css('background','#e4393c')
                    let d = $('.bundlev2 h3.title:contains("'+qgTitle[i]+'")').closest(".item-detail").prev('.item-cb');
                    d.find("label").click();
                    d.find("input[type=checkbox]").prop('checked',true);
                } catch (e) {
                    console.log(e)
                }
            }

            let checked = $('.bundlev2 .item-cb input:checked');
            let da = new Date();
            chrome.extension.sendRequest({type: "log", data:["开抢点击",da.getMinutes()+":"+da.getSeconds(),"选中了",checked.length,"个"]});
            if (sessionStorage['reload_count'] <= 10 && checked.length != qgTitle.length) {
                console.log(checked.length, qgTitle.length);
                location.reload();
                return;
            }
            sessionStorage.removeItem('qg_title');
            sessionStorage.removeItem('reload_count');
            $(".footer .btn").click();
        }
    });
})(jQuery);

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
console.log(timestampToTime(new Date().getTime()),'qg_title',qgTitle);
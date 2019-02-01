/**
 * 优惠券页面 主要是抓取页面的券信息
 * 提交给服务器，并且解析出商品ID 提交给
 * 服务器，生成高佣连接替换将要跳转的连接
 * @type {string}
 */
$(function () {
    var clickUrl = $("a.item-detail").attr("href");

    try {
        console.log(clickUrl);
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', clickUrl, true);
        xhr.send(null);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var headers = xhr.getAllResponseHeaders();
                headers = headers.trim().split(/[\r\n]+/);
                var headerMap = {};
                headers.forEach(function (line) {
                    var parts = line.split(': ');
                    var header = parts.shift();
                    var value = parts.join(': ');
                    headerMap[header] = value;
                });
                console.log(headerMap.at_itemid);
                if (!headerMap.at_itemid) return;
                var data = {
                    num_iid:headerMap.at_itemid
                };
                chrome.extension.sendRequest({type: "getClickUrl",data:data}, function(r){

                });
            }
        };
    } catch (e) {
        console.log(e);
    }

});
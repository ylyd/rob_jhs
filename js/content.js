$(function () {
    var url = window.location.href;
    var id = url.match(/id=(\d{5,20})/);
    if (id && id[1]) {
        id = id[1];
    }
    var jhsNowTimeInfoUrl = 'https://dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+id;
    $.getJSON(jhsNowTimeInfoUrl, function (d) {
        console.log('jhs',d);
    });
});
$(function () {
    var url = window.location.href;
    var id = url.match(/id=(\d{5,20})/);
    if (id && id[1]) {
        id = id[1];
    }
    // var jhsNowTimeInfoUrl = 'https://dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+id;
    // $.getJSON(jhsNowTimeInfoUrl, function (d) {
    //     console.log('jhs',d);
    // });
    var jhsItemInfoUrl = 'https://h5api.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?jsv=2.4.8&appKey=12574478&t='+(new Date().getTime())+'&sign=c4c5abe87a1c0743b85c0bba3f44b632&api=mtop.taobao.detail.getdetail&v=6.0&callback=mtopjsonp4&ttid=2017%40taobao_h5_6.6.0&AntiCreep=true&data=%7B%22itemNumId%22%3A%22'+id+'%22%7D';

    $.ajax({
        url:jhsItemInfoUrl,
        method:'GET',
        dataType:'text',
        timeout:1000,
        success:function (d) {

            if (d.indexOf('mtopjsonp4(')!=-1){
                d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.apiStack && d.data.apiStack[0]) {
                    var info = JSON.parse(d.data.apiStack[0].value);
                    info = {
                        endTime:info.vertical.jhs.endTime,
                        startTime:info.vertical.jhs.startTime,
                        systemTime:info.otherInfo.systemTime,
                    };
                    console.log('jhs2',info);
                }
            }
        },
        error:function (xhr,status,error) {
            console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
        }
    });
});
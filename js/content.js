var qgUrl = window.location.href;
var qgId = qgUrl.match(/id=(\d{5,20})/);
if (qgId && qgId[1]) {
    qgId = qgId[1];
}
var skuId = qgUrl.match(/skuId=(\d{5,20})/);
if (skuId && skuId[1]) {
    skuId = '&skuId='+skuId[1];
} else {
    skuId = '';
}
//获取抢购的信息
var qgInfo = null;
chrome.extension.sendRequest({type: "getLocalQgItemById", id:qgId}, function(r){
    if(r && r.info){
        qgInfo = JSON.parse(r.info);
    }
});

$(function () {
    let id = qgId;
    var itemInfo = null;
    var userInfo = null;
    let sTime = new Date().getTime();

    let jhsItemInfoUrl = '//h5api.m.taobao.com/h5/mtop.taobao.detail.getdetail/6.0/?jsv=2.4.8&appKey=12574478&t='+(new Date().getTime())+'&sign=c4c5abe87a1c0743b85c0bba3f44b632&api=mtop.taobao.detail.getdetail&v=6.0&callback=mtopjsonp4&ttid=2017%40taobao_h5_6.6.0&AntiCreep=true&data=%7B%22itemNumId%22%3A%22'+id+'%22%7D';
    let isTaoBaoPage = qgUrl.indexOf('://item.taobao.com') != -1,skuBase = {},skuBaseBySkuId = {};
    var qgDomParent = null,qgDomParentId = isTaoBaoPage ? "#J_juValid" : "#J_ButtonWaitWrap";
    $.ajax({
        url:jhsItemInfoUrl,
        method:'GET',
        dataType:'text',
        timeout:1000,
        success:function (d) {
            var eTime = new Date().getTime();
            console.log(eTime,sTime,eTime-sTime);
            if (d.indexOf('mtopjsonp4(')!=-1){
                d = JSON.parse(d.slice(d.indexOf('(') + 1,-1));
                console.log('d.data',d.data);
                if (d.ret[0] == 'SUCCESS::调用成功' && d.data && d.data.apiStack && d.data.apiStack[0]) {
                    if (isTaoBaoPage) {
                        let skuBaseTmp = d.data.skuBase.skus;
                        for (let b in skuBaseTmp) {
                            let skuid = skuBaseTmp[b].skuId;
                            let propPath = skuBaseTmp[b].propPath;
                            skuBaseBySkuId[skuid] = propPath;
                            skuBase[propPath] = skuid;
                        }
                        console.log("skuBase",skuBase);
                    }
                    let item = d.data.item;
                    itemInfo = {
                        num_iid:id,
                        title:item.title,
                        images:item.images.slice(0,2),
                        price:0
                    };
                    var info = JSON.parse(d.data.apiStack[0].value);
                    console.log('info', info);
                    if (!userInfo) {
                        userInfo = {};
                    }
                    userInfo['area_id'] = info['delivery']['areaId'];
                    userInfo['address_id'] = info['delivery']['addressId'];
                    userInfo['completedTo'] = info['delivery']['completedTo'];
                    countDown.lazyTimeArr.push(eTime-sTime);
                    if (info.vertical.jhs) {
                        let systime = isTaoBaoPage ? (new Date().getTime()) : info.otherInfo.systemTime;
                        info = {
                            endTime:info.vertical.jhs.endTime,
                            startTime:info.vertical.jhs.startTime,
                            systemTime:systime *1 + (eTime-sTime)
                        };
                        console.log('jhs2',info);

                        // 2.检查是否聚划算 可已抢购
                        // a.根据开始时间 结束时间 当前时间
                        // b. 当前时间 < 开始时间 加入抢购 选择购买的属性 加入成功 显示倒计时
                        // c. 开始时间 <= 当前时间 <= 结束时间 如果已经加入抢购时 立即抢购 进入h5页面

                        //未开始
                        if (info.systemTime < info.startTime) {
                            //显示抢购倒计时
                            setTimeout(function () {
                                countDown.go(info)
                            },1000);
                        } else if(qgInfo) {
                            //立即抢
                            console.log("立即抢");
                        }
                    }
                }
            }
        },
        error:function (xhr,status,error) {
            layer.confirm('页面似乎遇到了一点错误，是否从新加载？', {
                btn: ['嗯！确定','不了'] //按钮
            }, function(){
                location.reload();
            });
            console.log("错误提示： " + xhr.status + " " + xhr.statusText,error);
        }
    });

    //显示倒计时

    var countDown = {
        lazyTimeArr:[],
        info: null,
        downTimeDom:null,
        kqBtn:null,
        init:function(){
            //获取 插件插入内容的父dom
            qgDomParent = $(qgDomParentId);
            if(!qgDomParent.get(0)) {
                return;
            }
            qgDomParent.html('<div class="qg-l-box"><span class="qg-kq-txt"><i class="fa fa-clock-o"></i> 开抢：</span><span id="qg_down_time"></span>' +
                '<a id="qg_setting" title="使用前须知"><i class="fa fa-cogs"></i> 设置 & 帮助</a>' +
                '<form method="post" id="qg_form"><div class="qg-gzh"><img src="//qr.api.cli.im/qr?data=http%253A%252F%252Fxiaoaidema.com&level=H&transparent=false&bgcolor=%23ffffff&forecolor=%23000000&blockpixel=12&marginblock=1&logourl=&size=260&kid=cliim&key=a8b261387b9f090b0f6c0a1bc3f48ae6">' +
                '<br> <b>聚抢先公众号</b></div> <input type="hidden" name="tb_id"><input type="hidden" name="area_id">' +
                '<input type="hidden" name="address_id">' +
                '<ul class="qg-frist-ul" data-for="prefix">' +
                '      <li> <input type="password" name="pay_password" placeholder="输入支付密码" class="ppfix post key" /><span class="postfix key"></span></li>\n' +
                '<li class="qg-form-info"><i class="fa fa-cny"></i> 抢单 <strong style="color: red">自动支付</strong> 时使用，插件绝不外泄，也不上传远程，并做加密保存 可放心填写。不填默认抢单成功后人工输入，但抢单成功率会降低。</li>'+
                '      <li> <input type="text" name="tb_username" placeholder="淘宝用户名" class="ppfix post user" /><span class="postfix user"></span></li>\n' +
                '      <li> <input type="password" name="tb_password" placeholder="淘宝登录密码" class="ppfix post key" /><span class="postfix key"></span></li>\n' +
                '<li class="qg-form-info" style="text-align: center;margin-top: 5px;"><a href="" target="_blank"> © 聚抢先官网</a></li>'+
                '    </ul><ul class="qg-form-shuoming"><li><h6>抢购须知</h6></li>' +
                '<li>1. 插件抢购时请提前登录淘宝账号，为了避免 无人值守时淘宝账号掉线，希望您能填写淘宝账号密码，以便插件帮你自动登录，提高抢购几率。</li>' +
                '<li>2. 插件抢购在网络状况良好时，可以瞬间为您抢到宝贝。这时需要您立即付款以便抢到前<strong>n</strong> 名的优惠价格。您可以提前设置好支付密码以便插件自动付款，提高抢购几率。</li>' +
                '<li>3. 插件不会泄露您的任何个人信息，所有信息加密处理。</li>' +
                '<li>4. 插件会为您搜索最高优惠券【包括各种内部券】为您自动领取，走最优惠途径购买。</li>' +
                '<li>5. 关注官方微信公众号，方便及时的知道您的抢购结果，随时随地 添加、取消抢购，还有机会领取各种购物红包。</li></ul></form></div><a id="kaiqiang_btn"></a>' +
                '<div class="tb-clear"></div>');
            if (isTaoBaoPage) {
                let propPath = skuBaseBySkuId[skuId];
                let JiskuObj = $("#J_isku");
                if (propPath) {
                    propPath = propPath.split(';');
                    for(let i in propPath) {
                        JiskuObj.find("li[data-value="+propPath[i]+"]").click();
                    }
                }
                $("#J_isku .tb-selected").each(function (i,v) {
                    skuArr.push($(v).attr('data-value'));
                });
            }
            if (qgDomParent.data('ok')) {
                return;
            }
            qgDomParent.on('click',"#qg_setting",function () {
                    let o = $(this),form = $("#qg_form");
                    if (!o.data('save')) {
                        o.data('save',1);
                        o.html('<i class="fa fa-save"></i> 保存设置');
                        form.show();
                        chrome.storage.sync.get('tb_info', function(r) {
                            if(r && r['tb_info']){
                                r = r['tb_info'];
                                for (let name in r) {
                                    form.find('input[name='+name+']').val(r[name]);
                                }
                            }
                            if (userInfo) {
                                if (!isTaoBaoPage) {
                                    let src = $("img.mui-mbar-tab-logo-prof-nick").attr('src');
                                    if (src) {
                                        let tbId = src.match(/userId=(\d{5,20})/);
                                        console.log(tbId);
                                        if (tbId && tbId[1]) {
                                            userInfo['tb_id'] = tbId[1];
                                        }
                                    }
                                }

                                userInfo['nick'] = $(isTaoBaoPage?".site-nav-login-info-nick ":"#login-info .j_Username").text();
                                if (userInfo['nick']) form.find('input[name=tb_username]').val(userInfo['nick']);
                                if (userInfo['tb_id']) form.find('input[name=tb_id]').val(userInfo['tb_id']);
                                if (userInfo['area_id']) form.find('input[name=area_id]').val(userInfo['area_id']);
                                if (userInfo['address_id']) form.find('input[name=address_id]').val(userInfo['address_id']);
                            }
                        });
                    }else{
                        o.data('save',null);
                        o.html('<i class="fa fa-cogs"></i> 设置 & 帮助');
                        form.submit();
                        let fdata = form.serializeArray();
                        let tmpdata = {};
                        for (let i in fdata) {
                            tmpdata[fdata[i].name] = fdata[i].value;
                        }
                        chrome.storage.sync.set({tb_info:tmpdata}, function() {
                            layer.msg('保存成功，感谢您对插件的信任与支持！');
                            form.hide();
                        });
                    }

                }).on('submit','#qg_form',function (e) {
                    //保存用户的设置
                    e.preventDefault();
                });
            countDown.downTimeDom = qgDomParent.find('#qg_down_time');
            countDown.kqBtn = qgDomParent.find("#kaiqiang_btn");
            qgDomParent.before('<div id="qg_info_alert" class="alert alert-danger">' +
                '请在虚线框中选择好 <strong>属性</strong> 跟 <strong>够买数量</strong> 在继续加入抢购！</div>');
            var qgInfoAlert = $("#qg_info_alert");

            if(qgInfo) {
                countDown.kqBtn.text("取消定时抢购");
            } else {
                countDown.kqBtn.text("加入定时抢购");
            }
            var prop = $(".tb-sku .tb-prop .J_TSaleProp");
            //按钮的响应样式 sku 的连接改变或者 够买的数量改变都会改变按钮的样式
            var changeQgAction = function(val){
                if (qgInfo && (location.href != qgInfo.url || (val && val!=qgInfo.count))) {
                    countDown.kqBtn.addClass('qg-red-btn').text("更新定时抢购");
                } else {
                    countDown.kqBtn.removeClass('qg-red-btn').text("加入定时抢购");
                }
            };
            //属性sku切换
            prop.on('click','li', function () {
                let o = $(this);
                if(!o.hasClass('tb-out-of-stock')) {
                    //判断切换是否要更新已经保存的抢购信息
                    changeQgAction();
                    o.closest('.tb-prop').removeClass('place-select-prop');
                }
            });
            //数量更新处理
            var jAmount = $(isTaoBaoPage ? "#J_IptAmount" : "#J_Amount").on('change input propertychange','.mui-amount-input',function () {
                console.log(this.value);
                changeQgAction(this.value);
            }).on('click','.mui-amount-btn span,.tb-increase,.tb-reduce',function () {
                changeQgAction(jAmount.find('.mui-amount-input').val());
            });
            //初始化够买数量
            if (qgInfo && qgInfo.count) {
                jAmount.find('.mui-amount-input').val(qgInfo.count);
            }
            //点击加入抢购按钮的逻辑
            countDown.kqBtn.click(function () {
                //首先判断用户是否登录过关注了微信号
                chrome.storage.sync.get('tb_info', function(r) {
                    if (!(r && r['tb_info'] &&
                        r['tb_info']['tb_username']&&r['tb_info']['tb_password']&&
                        r['tb_info']['tb_password'])) {
                        //没有注册或者信息不完善就必须先 关注微信号 填写信息才能加入抢购
                        qgDomParent.find("#qg_setting").click();
                        layer.msg('完善登录、支付信息在加入购买');
                        return;
                    }

                    //可以点击

                    let txt = countDown.kqBtn.text();
                    if (txt != "取消定时抢购") {
                        //todo 跟bg.js通信 把商品信息传入 成功后改变文字
                        //检测sku是否全部选中
                        addQgList.propSelectFlag = false;
                        prop.each(function (i,v) {
                            let o = $(v);
                            if(!o.find('li.tb-selected').get(0)) {
                                addQgList.propSelectFlag = true;
                                o.closest('.tb-prop').addClass('place-select-prop');
                            } else {
                                o.closest('.tb-prop').removeClass('place-select-prop');
                            }
                        });
                        if (addQgList.propSelectFlag) {
                            qgInfoAlert.show(100);
                            return;
                        }
                        addQgList.propSelectFlag = false;
                        qgInfoAlert.hide(100);
                        addQgList.add();
                    } else{
                        addQgList.cancel();
                    }
                });


            });
            qgDomParent.addClass('J_ButtonWaitWrap').data('ok',1);
            console.log("初始化成功！");
        },
        go : function (info) {
            console.log("开始倒计时",info);
            this.init();
            this.info = info;
            this.timeDown();
            this.proof();
        },
        // 时间倒计时
        timeDown : function () {
            let cha = countDown.info.startTime - countDown.info.systemTime,
                leftTime = parseInt(cha / 1000);//获得时间差

            if(!qgDomParent.find("#qg_down_time").get(0)) {
                countDown.init();
            } else {
                //小时、分、秒需要取模运算
                let d = parseInt(leftTime/86400),
                    h = parseInt(leftTime/3600%24),
                    m = parseInt(leftTime/60%60),
                    s = parseInt(leftTime%60),
                    ms = parseInt((cha / 100)%10),
                    txt = "";
                if (d) {
                    txt += d+"天";
                }
                if (h) {
                    txt += h+"小时";
                }
                if (m) {
                    txt += m+"分";
                }
                txt += s + "秒" + ms;
                countDown.downTimeDom.text(txt);

            }

            if(cha <= 1000){
                //todo 开始抢购 开抢页面由bg.js统一打开处理
                if (qgInfo) {
                    //location.href = qgInfo.url.str_replace('detail.','detail.m.');
                    return;
                }
            }
            countDown.info.systemTime = countDown.info.systemTime*1 + 100;
            setTimeout(countDown.timeDown,100);
        },
        //每60s校对一次时间 并且判断是否掉线
        proof:function () {
            let jhsNowTimeInfoUrl = '//dskip.ju.taobao.com/detail/json/item_dynamic.htm?item_id='+id;
            var sTime = new Date().getTime();
            $.getJSON(jhsNowTimeInfoUrl, function (d) {
                console.log('jhs',d);
                if (d && d.data) {
                    let eTime = new Date().getTime();
                    // countDown.lazyTimeArr.push(eTime-sTime);
                    countDown.info.systemTime = d.data.time*1 + (eTime-sTime);
                    // let arrayAverage = countDown.lazyTimeArr.reduce((acc, val) => acc + val, 0) / countDown.lazyTimeArr.length;
                    //通知后台 校验时间的准确
                    if (d.data.isLogin == 0) {
                        chrome.extension.sendRequest({type: "mustLogin"});
                    }
                }
                //setTimeout(countDown.proof,1000*120);
            });
            // console.log("countDown.lazyTimeArr",countDown.lazyTimeArr);
            // //随机弹出
            // if (countDown.lazyTimeArr.length>3){
            //     let index = Math.floor(Math.random()*countDown.lazyTimeArr.length);
            //     countDown.lazyTimeArr.splice(index,1)
            // }
        }
    };

    var addQgList = {
        currentUrl:(qgInfo ? qgInfo.url : null),
        propSelectFlag:false,
        add:function () {
            if(!qgInfo) qgInfo = {};
            qgInfo.url = location.href;
            if (isTaoBaoPage) {
                //计算sku
                let skuArr = [];
                $("#J_isku .tb-selected").each(function (i,v) {
                    skuArr.push($(v).attr('data-value'));
                });
                if (skuArr.length>0) {
                    let propPath = skuArr.join(';');
                    skuId = skuBase[propPath];
                    qgInfo.url+='&skuId='+skuId;
                }
            }
            qgInfo.count = $((isTaoBaoPage ? "#J_IptAmount" : "#J_Amount")+" .mui-amount-input").val();
            qgInfo['start_time'] = countDown.info.startTime;
            if(addQgList.propSelectFlag) {
                return;
            }
            let index = layer.load(0, {shade: false});
            itemInfo['price']=$(".tm-promo-price .tm-price").text();
            chrome.extension.sendRequest({type: "addQgList", id:qgId,qgInfo:qgInfo,itemInfo:itemInfo}, function(r){
                layer.close(index);
                if(r.status == 1){
                    countDown.kqBtn.removeClass('qg-red-btn').text("取消定时抢购");
                    $("#J_ImgBooth").clone().appendTo('body').addClass('piaoyi')
                        .animate({
                        'top':0,
                        'right':0,
                        'width':'5px',
                        'height':'5px',
                        'opacity':0.5
                    },'easeOutBounce',function () {
                        $(this).remove();
                    });
                    layer.msg('恭喜你，加入定时抢购成功！');
                } else if(r.status == -1) {
                    //需要用户登录
                    layer.open({
                        type: 1,
                        title: '微信扫码免费注册/登陆',
                        shadeClose: true,
                        shade: 0.8,
                        area: ['380px', '470px'],
                        content:'<div id="qg_wx_login" style="padding-left: 41px;"></div>',
                        success:function(lay,index){
                            var obj = new WxLogin({

                                self_redirect:true,

                                id:"qg_wx_login",

                                appid: r.data['appkey'],

                                scope: "snsapi_login",

                                redirect_uri: r.data['redirect_uri'],

                                state: r.data['user_token'],

                                style: "",

                                href: ""

                            });
                        }
                    });
                }
            });
        },
        cancel:function () {
            let index = layer.load(0, {shade: false});
            chrome.extension.sendRequest({type: "cancelQgList", id:qgId,startTime:countDown.info.startTime}, function(r){
                layer.close(index);
                if(r){
                    countDown.kqBtn.text("加入定时抢购");
                    layer.msg('成功取消本商品定时抢购！您可以随时加入定时抢购。');
                }
            });
        }
    };

$("body").append('<link href="https://cdn.bootcss.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">' +
    '<link href="https://cdn.bootcss.com/layer/2.3/skin/layer.css" rel="stylesheet">');
});
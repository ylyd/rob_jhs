//一般直接写在一个js文件中
var liSelectIndexLocal = localStorage['liSelectIndex']?localStorage['liSelectIndex']:2;
layui.use(['layer', 'form','element','laypage'], function(){
    var layer = layui.layer
        ,form = layui.form,element=layui.element,laypage=layui.laypage;

    Vue.use(VueLazyload, {
        preLoad: 1.3,
        error: 'js/layer/theme/default/load-err.jpg',
        loading: 'js/layer/theme/default/loading-0.gif',
        attempt: 1,
        // the default is ['scroll', 'wheel', 'mousewheel', 'resize', 'animationend', 'transitionend']
        listenEvents: [ 'scroll' ]
    })
    var main = new Vue({
        el: "#main",
        data: {
            tab: {
                li:[
                    {icon:'layui-icon-cart-simple', text:'待抢购', badge: {text:0, class:'layui-badge'},
                        firstDataFlag: 0, params: {action:'coupon/getMyQgItem',
                            param:{status:0, list:'desc',page:1,limit:5}},
                        callback: 'qgList',data:{}},
                    {text:'已抢购', 'badge':{text:0, class:'layui-badge'},firstDataFlag:0
                        , params: {action:'coupon/getMyQgItem',
                            param:{status:1, list:'desc',page:1,limit:5}},
                        callback: 'qgList',data:{}},
                    {icon:'layui-icon-fire', text:'精品推荐', badge: {text:3, class:'layui-badge'},firstDataFlag:0
                        , params: {action:'coupon/hot',
                            param:{status:1, list:'desc',page:1,limit:5}},
                        callback: 'qgList',data:{}},
                    {icon:'layui-icon-rmb', text:'累计收益', badge: {text:3, class:'layui-badge-dot'},firstDataFlag:0},
                    {icon:'layui-icon-set', text:'基本设置',firstDataFlag:0},
                ]
            }
        },
        methods: {
            timestampToTime:function(timestamp) {
                var date = new Date(timestamp*1);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
                Y = date.getFullYear() + '-';
                M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
                D = date.getDate() + ' ';
                h = date.getHours() + ':';
                m = date.getMinutes() + ':';
                s = date.getSeconds();
                return Y+M+D+h+m+s;
            },
            tabSelect: function(k) {
                localStorage['liSelectIndex'] = this.tab.liSelectIndex = k;
                if (this.tab.li[k].firstDataFlag) {
                    return;
                }
                //加载首次数据
                this.getData(k);
            },
            getData: function(k) {
                let initPage = this.tab.li[k].firstDataFlag;
                if (this.tab.li[k].firstDataFlag == -1) {
                    return;//正在获取请求中
                }
                this.tab.li[k].firstDataFlag = -1;//加锁
                if (!this.tab.li[k].params) {
                    return;
                }
                let data = this.tab.li[k].params;
                data['type'] = 'getPopupData';
                chrome.extension.sendRequest(data, (r) => {
                    this.tab.li[k].firstDataFlag = 1;
                    if(r.status == 1){
                        let callback = this.tab.li[k].callback;
                        if (callback) {
                            main[callback](r.data, k, initPage);
                        }
                    } else if(r.status == -1){
                        this.login(r);
                    }
                });
            },
            qgList: function(data, k, initPage) {
                this.tab.li[k].data = data;
                this.tab.li[k].badge.text = data.count>99 ? '99+' : data.count;
                if (initPage == 0) {
                    laypage.render({
                        elem: 'page'+k
                        ,count: data.count //数据总数，从服务端得到
                        ,limit:5
                        ,jump: (obj, first) => {
                            //obj包含了当前分页的所有参数，比如：
                            console.log(obj.curr); //得到当前页，以便向服务端请求对应页的数据。
                            console.log(obj.limit); //得到每页显示的条数
                            this.tab.li[k].params['param']['page'] = obj.curr;
                            //this.getData(k);
                            //首次不执行
                            if(!first){
                                //do something
                                this.getData(k);
                            }
                        }
                    });
                }
            },
            delQg:function (k) {
                layer.confirm('确定删除？', {
                    btn: ['嗯！确定','在等等'] //按钮
                }, () => {
                    let id = this.tab.li[liSelectIndexLocal].data.data[k]['num_iid'];
                    chrome.extension.sendRequest({type:'cancelQgList',id:id}, (r) => {
                        this.tab.li[k].firstDataFlag = 1;
                        if(r.status == 1){
                            this.tab.li[liSelectIndexLocal].data.data.splice(k,1);
                            this.tab.li[liSelectIndexLocal].data.count--;
                            layer.msg(r.msg);
                        }
                    });

                });
            },
            login:function (r) {
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
            },
            init:function () {
                chrome.extension.sendRequest({type:'getPopupData',action:'coupon/popupInit',param:{}}, (r) => {
                    if(r.status == 1){
                        for(let i in r.data) {
                            this.tab.li[i].badge.text = r.data[i]>99 ? '99+' : r.data[i];
                        }
                    }
                });
            }
        },
        created:function () {
            this.init();
            if (liSelectIndexLocal<=2){
                this.getData(liSelectIndexLocal);
            }
        }
    });

    $(function () {
        var layerIndex = 0;
        $('#main').on("mouseover","#jb-info",function () {
            layerIndex =layer.tips('100 金币 = ￥1元', '#jb-info');
        }).on("mouseout","#jb-info",function () {
            layer.close(layerIndex);
        });
    });
});

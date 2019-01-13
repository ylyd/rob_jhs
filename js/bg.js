var host = "nn.yishoudan.com", server = "http://" + host + "/index/jiexi";
chrome.browserAction.onClicked.addListener(function (tab) {
    window.open(chrome.extension.getURL('add.html'));
});
sessionStorage.setItem('background', 1);
window.open(chrome.extension.getURL('add.html'));
chrome.extension.onRequest.addListener(function (r, sender, sendResponse) {
    switch (r.type) {
        case 'getDaan':
            if (r.data) {
                var data = r.data;
                db.transaction(function (tx) {
                    tx.executeSql('SELECT rowid,A,B,C,D,daan FROM tiku WHERE ti =?', [data.ti], function (tx, results) {
                        var len = results.rows.length, daan;
                        if (len) {
                            var item = results.rows.item(0);

                            daan = [];
                            for (var j = 0; j < item.daan.length; j++) {
                                var c = item.daan.charAt(j);
                                // console.log(item[c],data['xuanxiang']);
                                var cur = $.inArray(item[c], data['xuanxiang']);
                                if (cur >= 0) {
                                    daan.push(cur);
                                }

                            }
                            // console.log(daan,data['xuanxiang']);
                            sendResponse({status: 1, msg: 'ok', data: daan});
                        } else {
                            console.log(data);
                            notice({title: "没有找到此题", content: data.ti, img: chrome.runtime.getURL("img/error.jpg")});
                            sendResponse({status: 0, msg: '没有找到【' + data.ti + '】本题'});
                        }

                    }, function (transaction, error) {
                        console.log(data);
                        sendResponse({status: 0, msg: '数据库错误', data: error});
                    });

                });
            }
            break;
        case 'getUserOne':
            db.transaction(function (tx) {
                var timeStamp = new Date(new Date().setHours(0, 0, 0, 0)) / 1000;
                tx.executeSql('SELECT * FROM user WHERE lasttime <? limit 1', [timeStamp], function (tx, results) {
                    var len = results.rows.length;
                    if (len) {
                        sendResponse({status: 1, msg: 'ok', data: results.rows.item(0)});
                    } else {
                        sendResponse({status: 0, msg: '今天的已经全部答题完毕'});
                    }

                }, function (transaction, error) {
                    sendResponse({status: 0, msg: '数据库错误', data: error});
                });

            });
            break;
        case "setUserTime":
            db.transaction(function (tx) {
                var timeStamp = new Date(new Date().setHours(0, 0, 0, 0)) / 1000;
                var id = sessionStorage.getItem("loginuid");
                console.log("loginuid", id);
                if (id) {
                    tx.executeSql('update user SET lasttime=? WHERE rowid =?', [timeStamp, id],
                        function (tx, results) {
                            console.log("error", results);
                            sendResponse({status: 1, msg: 'ok', data: results});

                        }, function (transaction, error) {
                            console.log("error", error, transaction);
                            sendResponse({status: 0, msg: 'ok', data: error});
                        });
                }
                var timeer = r.timeer;
                var fen = parseInt(timeer / 60000);
                var miao = parseInt((timeer % 60000) / 1000);
                timeer = fen + "分" + miao + "秒";
                notice({
                    title: "答题完毕用时 " + timeer,
                    content: '在' + timeer + '之后进行下一个用户答题',
                    img: chrome.runtime.getURL("img/timg.jpg")
                });
            });
            break;
        case "nextMsg":
            notice({title: "答题完毕请处理下一个用户", content: '登录下一个用户进行答题', img: chrome.runtime.getURL("img/next.jpg")});
            sendResponse(1);
            break;
        case "userLogin":
            sessionStorage.setItem("loginuid", r.id);
            break;
        case "getLogin":
            sendResponse(sessionStorage.getItem("loginuid"));
            break;
        case "addTiku":
            var data = r.data;
            db.transaction(function (tx) {
                console.log("创建tiku");
                tx.executeSql('DROP TABLE IF EXISTS tiku', [], function (transaction) {

                });
                tx.executeSql('CREATE TABLE IF NOT EXISTS tiku (id unique, ti,A,B,C,D,daan)', [], function (tx) {
                    console.log("创建新数据库成功");
                    for (var i in data) {
                        tx.executeSql('INSERT INTO tiku (id, ti,A,B,C,D,daan) VALUES (?,?,?,?,?,?,?)', [i, data[i].ti, data[i].A, data[i].B, data[i].C, data[i].D, data[i].daan], function (transaction) {
                            console.log("插入成功");
                        }, function (transaction, error) {
                            console.log(error);
                        });
                    }
                }, function (transaction, error) {
                    console.log(error);
                });
                sendResponse(1);
            });
            break;
        case "addUser":
            var data = r.data;
            db.transaction(function (tx) {
                tx.executeSql('DROP TABLE IF EXISTS user');
                var timestamp = 0;
                tx.executeSql('CREATE TABLE IF NOT EXISTS user (id unique, name,sex,username,password,lasttime)', [], function (tx) {
                    console.log("创建新数据库成功");
                    for (var i in data) {
                        tx.executeSql('INSERT INTO user (id,name,sex,username,password,lasttime) VALUES (?,?,?,?,?,?)', [data[i].id * 1 + 1, data[i].name, data[i].sex
                            , data[i].username, data[i].password, timestamp], function (transaction) {
                            console.log("插入成功");
                        }, function (transaction, error) {
                            console.log(error);
                        });
                    }
                }, function (transaction, error) {
                    console.log(error);
                });
                sendResponse(1);
            });
            break;

    }
});
var notice = function (data) {
    if (chrome.notifications) {
        var clickUrl = '';
        var stag = '';
        var items = [{
            title: '',
            message: data.content
        }];
        var buttons = [{
            title: data.title + "--开始时间：" + (data['start_time'] ? data['start_time'] : ""),
            iconUrl: chrome.runtime.getURL("icon19.png")
        }];

        var options = {
            type: "list",
            title: data.title, //商品标题
            message: data.content,
            iconUrl: data.img,
            items: items,
            buttons: buttons
        };
        var NotifyId = "item" + Math.ceil(Math.random() * 100);
        chrome.notifications.create(NotifyId, options, function (a) {
            stag = a;
        });
        chrome.notifications.onButtonClicked.addListener(function (a, c) {

        });
        chrome.notifications.onClicked.addListener(function (a) {
            // stag == a && chrome.tabs.create({url:clickUrl}, function(){});
        });
        chrome.notifications.clear(NotifyId, function () {
        }); //自内存清除弹窗提示
    } else {
        var show = window.webkitNotifications.createNotification(chrome.runtime.getURL("icon19.png"), data.content, "");
        show.onclick = function () {
            window.open(clickUrl);
        }
    }
}

var db = {
    dbname: "tiku",
    ver: '1.0',
    desc: '答题题库',
    size: 5 * 1024 * 1024,
    open: function () {
        db = openDatabase(this.dbname, this.ver, this.desc, this.size);
    }
};
db.open();


var getFromNte = function () {
    $.getJSON(server + "/getTiku", function (d) {
        if (d.status == 1) {
            addTiku(d.data);
        } else {
            layer.msg();
        }
    });
};
$(function () {

    $("#submit").on("click", function () {
        var data = [], count = 0;
        $("#container").children().each(function (i, v) {
            var o = $(v), text = o.text();
            text = $.trim(text);
            if (!data[count]) data[count] = {};
            if (/^\d{1,}.*选题(.*)/.test(text)) {
                var reg = /^\d{1,}.*选题(.*)/;
                text = text.match(reg);
                if (text && text[1]) data[count]['ti'] = text[1];
            } else if (/^([A-Z]{1,})、(.*)/.test(text)) {
                var reg = /^([A-Z]{1,})、(.*)/;
                text = text.match(reg);

                if (text && text[1] && text[2]) data[count][text[1]] = text[2];
            } else if (/^参考答案：([A-Z]{1,})/.test(text)) {
                var reg = /^参考答案：([A-Z]{1,})/;
                text = text.match(reg);
                if (text && text[1]) data[count++]['daan'] = text[1];
            }


        });
        addTiku(data);
    });

    $("#addUser").on("click", function () {
        var data = [], count = 0;
        $("#container tr").each(function (i, v) {
            var o = $(v);
            var obj = o.find("td");
            data[count++] = {
                id: i,
                name: $.trim(obj.eq(1).text()),
                sex: $.trim(obj.eq(2).text()),
                username: $.trim(obj.eq(7).text()),
                password: $.trim(obj.eq(8).text())
            };
        });
        console.log(data);
        db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS user');
            var timestamp = 0;
            tx.executeSql('CREATE TABLE IF NOT EXISTS user (id unique, name,sex,username,password,lasttime)', [], function (tx) {
                console.log("创建新数据库成功");
                for (var i in data) {
                    tx.executeSql('INSERT INTO user (id,name,sex,username,password,lasttime) VALUES (?,?,?,?,?,?)', [data[i].id * 1 + 1, data[i].name, data[i].sex
                        , data[i].username, data[i].password, timestamp], function (transaction) {
                        console.log("插入成功");
                    }, function (transaction, error) {
                        console.log(error);
                    });
                }
            }, function (transaction, error) {
                console.log(error);
            });
            layer.msg("创建用户成功");
        });
        // addUser(data);
    });

    $("#getnet").on("click", function () {
        getFromNte();
    });
});
chrome.storage.sync.get('tb_info', function(r) {
    if(r && r['tb_info']) {
        r = r['tb_info'];
        r.pay_password;
        if (!r.pay_password) {
            alert('请手动输入支付密码,今后为了方便您也可以在插件 设置 & 帮助 中提前设置好支付密码');
            return;
        }
        let elObj = document.getElementById('spwd_unencrypt');
        console.log(elObj);
        if (!elObj) {
            elObj = document.getElementById('pwd_unencrypt');
        }

        let Podium = {};
        Podium.keyup = function(k) {
            let oEvent = document.createEvent('KeyboardEvent');
            // Chromium Hack
            Object.defineProperty(oEvent, 'keyCode', {
                get : function() {
                    return this.keyCodeVal;
                }
            });
            Object.defineProperty(oEvent, 'which', {
                get : function() {
                    return this.keyCodeVal;
                }
            });

            if (oEvent.initKeyboardEvent) {
                oEvent.initKeyboardEvent("keyup", true, true, document.defaultView, false, false, false, false, k, k);
            } else {
                oEvent.initKeyEvent("keyup", true, true, document.defaultView, false, false, false, false, k, 0);
            }

            oEvent.keyCodeVal = k;

            if (oEvent.keyCode !== k) {
                console.log("keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")");
            }
            try {
                elObj.dispatchEvent(oEvent);
            } catch (e) {
                console.log(e);
                alert(e);
            }

        };

        let pw = r.pay_password;
        //96~105 => 0~9
        elObj.value=pw;
        for (let i in pw) {
            Podium.keyup(pw[i]*1+96);
        }
        //Podium.keyup(13);
    }
});
$(function () {
    $("button.am-button").click();
    console.log("触发了点击")
});
chrome.extension.sendRequest({type: "getSetting"},r => {
    console.log("获取支付");
    if(r){
        let loginInfo = JSON.parse(r);
        console.log("获取支付");
        if (loginInfo.pay_password) {
            $(function () {
                $("#cashierPreConfirm button.am-button").click(function () {
                    let elObj = document.getElementById('spwd_unencrypt');
                    Podium = {};
                    Podium.keyup = function(k) {
                        var oEvent = document.createEvent('KeyboardEvent');

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

                        elObj.dispatchEvent(oEvent);
                    };

                    let pw = loginInfo.pay_password;
                    console.log("输入支付",pw);
                    //96~105 => 0~9
                    elObj.value=pw;
                   for (let i in pw) {
                       Podium.keyup(pw[i]*1+96);
                   }
                    Podium.keyup(13);
                }).click();
            });
        } else {
            alert('请手动输入支付密码,今后为了方便您也可以在插件 设置 & 帮助 中提前设置好支付密码');
        }
    }
});

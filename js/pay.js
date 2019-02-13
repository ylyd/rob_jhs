chrome.extension.sendRequest({type: "getSetting"},r => {
    if(r){
        let loginInfo = JSON.parse(r);
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

                    //96~105 => 0~9
                    elObj.value=pw;
                   for (let i in pw) {
                       Podium.keyup(pw[i]*1+96);
                   }
                }).click();
            });
        }
    }
});

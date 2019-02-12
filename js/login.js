;$(function () {
    chrome.extension.sendRequest({type: "getSetting"},r => {
        if(r){
            let loginInfo = JSON.parse(r);
            if (loginInfo.tb_username && loginInfo.tb_password) {
                $("#username").val(loginInfo.tb_username);
                $("#password").val(loginInfo.tb_password);
                $("#submit-btn").removeAttr('disabled').click();
            }
        }
    });
});
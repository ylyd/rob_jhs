;
chrome.storage.sync.get('tb_info', function(r) {
    if(r && r['tb_info']) {
        let loginInfo = r['tb_info'];
        if (loginInfo.tb_username && loginInfo.tb_password) {
            $(function () {
                $("#username").val(loginInfo.tb_username);
                $("#password").val(loginInfo.tb_password);
                $("#submit-btn").removeAttr('disabled').click(function () {
                    console.log("触发了点击")
                }).click();
            });
        }
    }
});
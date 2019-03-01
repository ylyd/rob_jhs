$(function () {
    let tjBtn = $("#J_formBtn");
    if (tjBtn && tjBtn.get(0)) {
        tjBtn.click();
    } else {
        chrome.extension.sendRequest({type: "getQuanUrl"}, r => {
            if (r) location.href = r;
        });
    }
});
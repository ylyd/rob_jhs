chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        sendResponse({counter: request.counter + 1 });
    }
);

chrome.runtime.onInstalled.addListener(function () {
  // Do any necessary initialization here
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "takeScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "jpeg" }, function (dataUrl) {
      sendResponse({ screenshot: dataUrl });
    });
    return true; // Required to keep the message channel open for sendResponse
  }
});
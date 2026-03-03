// Content Script injected into the matched pages (e.g. instagram.com)

console.log("FriendDiff Network Injector is running.");

function injectScript(file_path, node) {
  var th = document.getElementsByTagName(node)[0];
  var s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', file_path);
  th.appendChild(s);
  s.onload = function() {
      this.remove();
  };
}

// Get the URL of the interceptor script packaged with our extension
const interceptorUrl = chrome.runtime.getURL("interceptor.js");
injectScript(interceptorUrl, 'body');

// Listen for the Custom Event dispatched by the Main World script
window.addEventListener('FRIEND_DIFF_DATA', function(element) {
  const { friends, hasNextPage, isFirstPage, userId, username } = element.detail;
  
  function sendData() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ 
          action: "REPORT_FRIEND_LIST", 
          data: friends, 
          isEnd: !hasNextPage, 
          isFirstPage: isFirstPage,
          userId: userId,
          username: username
        });
        console.log(`FriendDiff: Data sent to Background (isFirst: ${isFirstPage}, isEnd: ${!hasNextPage}, userId: ${userId}, username: ${username})`);
      } catch (e) {
        console.warn("FriendDiff Extension context invalidated:", e);
      }
    } else {
      console.warn("FriendDiff: chrome.runtime is not available in this context.");
    }
  }

  sendData();
});

window.addEventListener('FRIEND_DIFF_ERROR', function(element) {
  const { message } = element.detail;
  alert(`FriendDiff Cảnh Báo: ${message}`);
  
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: "STOP_SCAN" }).catch(() => {});
  }
});

// Listen for broadcast logs from the Background script so we can see them in F12
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'BROADCAST_LOG') {
    if (request.type === 'error') {
       console.log(`%c[FriendDiff Background] ${request.message}`, "color: red; font-weight: bold; font-size: 14px;");
    } else {
       console.log(`%c[FriendDiff Background] ${request.message}`, "color: #ff00ff; font-weight: bold;");
    }
  }
});

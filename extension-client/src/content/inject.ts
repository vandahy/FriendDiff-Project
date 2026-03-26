// Content Script injected into the matched pages (e.g. instagram.com)

console.log("FriendDiff Network Injector is running.");

const AUTO_LOGIN_KEY = 'friendDiffAutoLoginUsername';

function injectScript(file_path: string, node: string) {
  const th = document.getElementsByTagName(node)[0];
  if (!th) return;
  const s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', file_path);
  th.appendChild(s);
  s.addEventListener('load', function () {
    this.remove();
  });
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getAutoLoginUsername(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTO_LOGIN_KEY], (res) => {
      resolve((res as any)[AUTO_LOGIN_KEY] || null);
    });
  });
}

function clearAutoLoginUsername(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([AUTO_LOGIN_KEY], resolve);
  });
}

async function tryAutoLogin(): Promise<void> {
  if (!window.location.hostname.includes('instagram.com')) return;

  const username = await getAutoLoginUsername();
  if (!username) return;

  const path = window.location.pathname;
  const isLoginPage = path.startsWith('/accounts/login');
  const isLogoutPage = path.startsWith('/accounts/logout');
  const isFloRoot = path === '/' && window.location.search.includes('flo=true');
  const isAlreadyProfile = path.replace(/\/$/, '') === `/${username}`;
  const loggedIn = !!getCookie('ds_user_id');

  // If we are on the logout/flo page, redirect to login so we can sign in as the selected user.
  if (!loggedIn && (isLogoutPage || isFloRoot)) {
    window.location.href = `https://www.instagram.com/accounts/login/`;
    return;
  }

  // On the login page, prefill the username and focus password.
  if (isLoginPage) {
    const input = document.querySelector<HTMLInputElement>('input[name="username"], input[name="email"], input[id="loginUsername"]');
    if (input) {
      input.value = username;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
      if (passwordInput) {
        passwordInput.focus();
      }
    }
    return;
  }

  // After login completes, redirect to the desired profile page.
  if (loggedIn && !isAlreadyProfile) {
    await clearAutoLoginUsername();
    window.location.href = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  }
}

// Try auto-login immediately and when storage changes.
tryAutoLogin().catch(() => { });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[AUTO_LOGIN_KEY]) {
    tryAutoLogin().catch(() => { });
  }
});

// Get the URL of the interceptor script packaged with our extension
const interceptorUrl = chrome.runtime.getURL("interceptor.js");
injectScript(interceptorUrl, 'body');

// Listen for the Custom Event dispatched by the Main World script
window.addEventListener('FRIEND_DIFF_DATA', function (e: Event) {
  const element = e as CustomEvent;
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

window.addEventListener('FRIEND_DIFF_ERROR', function (e: Event) {
  const element = e as CustomEvent;
  const { message } = element.detail;
  alert(`FriendDiff Cảnh Báo: ${message}`);

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: "STOP_SCAN" }).catch(() => { });
  }
});

// Listen for broadcast logs from the Background script so we can see them in F12
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'BROADCAST_LOG') {
    if (request.type === 'error') {
      console.log(`%c[FriendDiff Background] ${request.message}`, "color: red; font-weight: bold; font-size: 14px;");
    } else {
      console.log(`%c[FriendDiff Background] ${request.message}`, "color: #ff00ff; font-weight: bold;");
    }
  }
});

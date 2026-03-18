# FriendDiff

**FriendDiff** is a browser extension + backend stack that helps you detect **who unfollowed you on Instagram** by scanning your follower list and comparing it to a stored snapshot.

It works by:
- Scanning the **full followers list** on Instagram (auto-scroll + interception)
- Keeping a **snapshot** of the previous scan
- Diffing the follower lists to identify **unfollowers**
- Optionally sending **Telegram alerts** via a local backend

---

## 🚀 Core Idea (Cốt lõi của dự án)

FriendDiff’s core is **unfollower detection**. It treats your last successful scan as a "snapshot" and compares it against the current follower list.

When the newest scan is complete, the extension detects who is missing from the snapshot and reports them as **unfollowers**.

The backend is optional but recommended when you want:
- Telegram notifications for unfollowers
- Daily analytics summaries (install/active counts)

---

## 🧩 Architecture Overview

| Component | Purpose |
|----------|---------|
| **Chrome Extension (extension-client)** | Scans Instagram follower list, stores snapshots, detects unfollowers, and communicates with backend. |
| **Backend API (api-server)** | Receives unfollower events and optionally forwards them to Telegram. Also records analytics events. |
| **Telegram Bot** | Sends real-time unfollower alerts via Chat ID (configured via backend `.env`). |

---

## 🛠️ Setup

### 1) Backend (api-server)

#### Prerequisites
- Python 3.11+ (recommended)
- `pip` available

#### Install
```bash
cd "d:/study/A on tap/FriendDiff/api-server"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Telegram (optional but recommended)
Create or update `api-server/.env` with your bot configuration:

```env
TELEGRAM_BOT_TOKEN=your_unfollower_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Optional: analytics bot (daily install/active summary)
ANALYTICS_BOT_TOKEN=your_analytics_bot_token
ANALYTICS_CHAT_ID=your_analytics_chat_id
```

#### Run the backend
```bash
cd "d:/study/A on tap/FriendDiff/api-server"
venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at: `http://127.0.0.1:8000`

---

### 2) Extension (extension-client)

This is a Vite + React project that builds the Chrome extension.

#### Install dependencies
```bash
cd "d:/study/A on tap/FriendDiff/extension-client"
yarn install
```

#### Build the extension
```bash
yarn run build
```

#### Load into Chrome / Edge
1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select: `d:/study/A on tap/FriendDiff/extension-client/dist`

> Notes:
> - The extension uses `127.0.0.1:8000` as the backend API host.
> - If you run the backend on another port, update the fetch URL in `src/background/service_worker.ts`.

---

## ✅ Usage (How to find unfollowers)

1. Navigate to your Instagram profile page.
2. Open the FriendDiff extension popup.
3. Click **Scan followers now** (or similar button).
4. The extension will automatically scroll through your full follower list, build a snapshot, and compare it with the last stored snapshot.
5. If any unfollowers are detected, they will appear in the popup UI and (optionally) be sent to Telegram.

> Tip: The extension uses a safe scrolling rate to reduce the chance Instagram blocks or rate-limits you.

---

## 🔧 Customization

### Change backend URL
If you need the extension to call a different backend URL (e.g. Docker, remote host), update the hard-coded URL in:
- `extension-client/src/background/service_worker.ts` – currently set to `http://127.0.0.1:8000`

### Telegram notifications
If you want unfollower alerts to appear in Telegram:
1. Create a Telegram Bot via @BotFather.
2. Get your **chat id** (send a message to the bot and use an API call, or use services like `@userinfobot`).
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `api-server/.env`.

---

## 🧪 Development Notes

- **Snapshot persistence**: Follower snapshots are saved in `chrome.storage.local`, per Instagram user ID.
- **Unfollowers history**: The extension keeps the last 50 unfollowers shown in the UI.
- **Safety checks**: If a scan collects significantly fewer followers than expected (likely due to a network error or Instagram blocking), the extension refuses to declare unfollowers and retains the old snapshot.

---

## 🚧 Troubleshooting

- **No unfollowers detected even though someone unfollowed**
  - Ensure you scanned the full follower list (the extension scrolls automatically). If scanning stops early, refresh the profile and try again.

- **Extension appears inactive / not scanning**
  - Make sure you're on Instagram and logged in.
  - Open DevTools (F12) on Instagram and check for `FriendDiff` logs.

- **Telegram notification not received**
  - Confirm your backend is running and reachable at `http://127.0.0.1:8000`.
  - Check the backend logs and ensure `.env` has correct bot token and chat id.

---

## ⚙️ Project Structure

- `extension-client/` – Chrome extension (React + Vite)
  - `src/` – extension source (popup UI, background service worker, injected script)
  - `public/manifest.json` – Chrome extension manifest
- `api-server/` – FastAPI backend for Telegram notifications + analytics

---

## 🧠 Why FriendDiff?

Instagram does not provide a built-in way to see who unfollowed you, and third-party services often require you to log in with your credentials.

FriendDiff keeps everything local (snapshot diffing in your browser), and only uses an optional backend to deliver **notifications**, keeping your account data private and under your control.

---

## 🛡️ Disclaimer

Use this extension responsibly. Excessive automated scanning of Instagram can trigger rate limits or temporary blocks. Always stay within Instagram's terms of service.

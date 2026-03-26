# FriendDiff

**FriendDiff** is a browser extension + backend stack that helps you detect **who unfollowed you on Instagram** by scanning your follower list and comparing it to a stored snapshot.

It works by:
- Scanning the **full followers list** on Instagram (auto-scroll + interception)
- Keeping a **snapshot** of the previous scan
- Diffing the follower lists to identify **unfollowers**
- Optionally sending **Telegram alerts** via a local backend

---

## 🚀 Core Idea (Cốt lõi của dự án)

FriendDiff's core is **unfollower detection**. It treats your last successful scan as a "snapshot" and compares it against the current follower list.

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

## ⚡ Quick Start (Khởi động nhanh)

> Dành cho người mới clone dự án về — không cần gõ lệnh.

### Yêu cầu trước khi chạy
- **Python 3.11+** đã cài và thêm vào PATH → [python.org](https://www.python.org/downloads/)
- **Node.js (LTS)** đã cài → [nodejs.org](https://nodejs.org)

### Chạy toàn bộ dự án (1 click)

```
double-click: run-friendDiff.bat
```

File này sẽ tự động mở 2 cửa sổ riêng biệt:

- 🟢 **API Server** — tự tạo `venv` + cài dependencies nếu chưa có, sau đó khởi động server tại `http://127.0.0.1:8000`
- 🔵 **Extension Builder** — tự cài `yarn` và `node_modules` nếu chưa có, sau đó build extension ra thư mục `dist/`

### Hoặc chạy từng phần

| File | Chức năng |
|------|-----------|
| `auto-run/run-api-server.bat` | Chỉ khởi động backend API |
| `auto-run/run-extension.bat` | Chỉ build extension client |

---

## 📌 Ghim lên Taskbar (tuỳ chọn)

> File `.bat` không thể ghim trực tiếp lên taskbar — cần tạo **shortcut `.lnk`** và đặt nó **ngoài thư mục dự án** để tránh bị git track.

### Các bước thực hiện

**Bước 1 — Tạo shortcut**

Chuột phải vào Desktop (hoặc bất kỳ thư mục nào ngoài `FriendDiff/`) → **New → Shortcut**

**Bước 2 — Điền Target**

Trong ô **"Type the location of the item"**, dán lệnh sau (thay đường dẫn thực tế trên máy bạn):

```
cmd /c "D:\study\A on tap\FriendDiff\run-friendDiff.bat"
```

> Nếu muốn shortcut riêng cho từng phần:
> ```
> cmd /c "D:\study\A on tap\FriendDiff\auto-run\run-api-server.bat"
> ```
> ```
> cmd /c "D:\study\A on tap\FriendDiff\auto-run\run-extension.bat"
> ```

**Bước 3 — Đặt tên shortcut**

Ví dụ: `FriendDiff`, `FriendDiff - API`, `FriendDiff - Extension`

**Bước 4 — Đổi icon (tuỳ chọn)**

Chuột phải vào shortcut → **Properties → Change Icon**

Một số nguồn icon có sẵn trên Windows:
- `C:\Windows\System32\shell32.dll`
- `C:\Windows\System32\imageres.dll`

**Bước 5 — Ghim lên Taskbar**

Chuột phải vào shortcut → **Pin to taskbar**

> ✅ Shortcut nằm ngoài thư mục `FriendDiff/` nên **không bị git track**, không xuất hiện trong `git status`.

---

## 🛠️ Setup thủ công (Manual Setup)

<details>
<summary>Mở rộng nếu bạn muốn tự chạy lệnh</summary>

### 1) Backend (api-server)

#### Prerequisites
- Python 3.11+ (recommended)
- `pip` available

#### Install
```bash
cd api-server
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
cd api-server
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The API will be available at: `http://127.0.0.1:8000`

---

### 2) Extension (extension-client)

#### Install dependencies
```bash
cd extension-client
yarn install
```

#### Build the extension
```bash
yarn build
```

</details>

---

## 🔌 Load Extension vào Chrome / Edge

1. Mở `chrome://extensions` (hoặc `edge://extensions`)
2. Bật **Developer mode**
3. Nhấn **Load unpacked**
4. Chọn thư mục: `extension-client/dist`

> **Lưu ý:** Mỗi khi build lại extension, cần nhấn nút **Reload** (🔄) trên trang `chrome://extensions` để cập nhật.

---

## ✅ Usage (How to find unfollowers)

1. Truy cập trang profile Instagram của bạn.
2. Mở popup của extension FriendDiff.
3. Nhấn **Scan followers now**.
4. Extension sẽ tự động scroll qua toàn bộ danh sách followers, tạo snapshot và so sánh với lần scan trước.
5. Nếu phát hiện unfollower, họ sẽ hiện lên trong popup và (tuỳ chọn) được gửi thông báo qua Telegram.

> **Tip:** Extension sử dụng tốc độ scroll an toàn để giảm nguy cơ bị Instagram giới hạn tốc độ.

---

## 🔧 Customization

### Đổi URL backend
Nếu cần trỏ extension sang backend URL khác (Docker, remote host...), cập nhật URL trong:
- `extension-client/src/background/service_worker.ts` — hiện đang là `http://127.0.0.1:8000`

### Telegram notifications
1. Tạo Telegram Bot qua @BotFather.
2. Lấy **chat id** của bạn (dùng @userinfobot hoặc gọi Telegram API).
3. Điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` vào `api-server/.env`.

---

## 🧪 Development Notes

- **Snapshot persistence**: Follower snapshots được lưu trong `chrome.storage.local`, theo từng Instagram user ID.
- **Unfollowers history**: Extension giữ lại tối đa 50 unfollower gần nhất trong UI.
- **Safety checks**: Nếu scan thu về ít followers hơn đáng kể so với snapshot cũ (có thể do lỗi mạng hoặc Instagram chặn), extension sẽ từ chối cập nhật snapshot để tránh báo nhầm.

---

## 🚧 Troubleshooting

- **Không phát hiện unfollower dù có người đã unfollow**
  - Đảm bảo đã scan toàn bộ danh sách (extension tự động scroll). Nếu scan dừng sớm, hãy reload trang profile và thử lại.

- **Extension không hoạt động / không scan**
  - Kiểm tra bạn đang ở trang Instagram và đã đăng nhập.
  - Mở DevTools (F12) trên Instagram và tìm log có chữ `FriendDiff`.

- **Không nhận được thông báo Telegram**
  - Xác nhận backend đang chạy tại `http://127.0.0.1:8000`.
  - Kiểm tra log backend và đảm bảo `.env` có đúng bot token và chat id.

- **Lỗi khi chạy file `.bat`**
  - Đảm bảo Python và Node.js đã được cài và thêm vào PATH hệ thống.
  - Chạy thử `python --version` và `node --version` trong Command Prompt để kiểm tra.

- **Shortcut trên taskbar báo lỗi không tìm thấy file**
  - Kiểm tra lại đường dẫn trong **Target** của shortcut — phải khớp chính xác với nơi bạn clone dự án về.

---

## ⚙️ Project Structure

```
FriendDiff/
├── run-friendDiff.bat          ← Chạy toàn bộ dự án (1 click)
├── auto-run/
│   ├── run-api-server.bat      ← Chạy riêng backend
│   └── run-extension.bat       ← Build riêng extension
├── api-server/                 ← FastAPI backend
│   ├── app/
│   └── requirements.txt
├── extension-client/           ← Chrome Extension (React + Vite)
│   ├── src/
│   ├── public/manifest.json
│   └── dist/                   ← Output sau khi build (load vào Chrome)
└── README.md
```

> 📌 **Shortcut taskbar** được đặt **ngoài thư mục này** để tránh bị git track.

---

## 🧠 Why FriendDiff?

Instagram không cung cấp tính năng xem ai đã unfollow bạn, và các dịch vụ bên thứ ba thường yêu cầu bạn đăng nhập bằng tài khoản Instagram.

FriendDiff giữ mọi thứ ở local (so sánh snapshot ngay trên trình duyệt), chỉ dùng backend tuỳ chọn để gửi **thông báo** — giữ dữ liệu tài khoản của bạn riêng tư và dưới sự kiểm soát của bạn.

---

## 🛡️ Disclaimer

Hãy sử dụng extension này có trách nhiệm. Scan Instagram quá nhiều có thể kích hoạt rate limit hoặc tạm thời bị chặn. Luôn tuân thủ điều khoản dịch vụ của Instagram.

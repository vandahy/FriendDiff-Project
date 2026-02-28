import { getSnapshot, saveSnapshot } from '../utils/storage.js';

console.log("FriendDiff Background Service Worker initialized.");

// We use chrome.storage.local to persist the buffer across Service Worker Sleeps!
// Manifest V3 kills the SW if idle, clearing global variables like `let sessionBuffer = new Map()`

async function getSessionBuffer(userId) {
  const key = `friendDiffSessionBuffer_${userId}`;
  const data = await chrome.storage.local.get([key]);
  return data[key] || []; // Array of {id, name}
}

async function appendToSessionBuffer(userId, friendsBatch) {
  let existingBuffer = await getSessionBuffer(userId);
  
  // Deduplicate by ID
  const existingIds = new Set(existingBuffer.map(f => f.id));
  friendsBatch.forEach(f => {
    if (!existingIds.has(f.id)) {
      existingBuffer.push(f);
    }
  });

  const key = `friendDiffSessionBuffer_${userId}`;
  await chrome.storage.local.set({ [key]: existingBuffer });
  return existingBuffer;
}

async function clearSessionBuffer(userId) {
  const key = `friendDiffSessionBuffer_${userId}`;
  await chrome.storage.local.remove([key]);
}

async function updateTrackedAccounts(userId, username) {
  if (!userId || !username) return;
  const data = await chrome.storage.local.get(['friendDiffTrackedAccounts']);
  let accounts = data.friendDiffTrackedAccounts || [];
  
  const idx = accounts.findIndex(a => a.userId === userId);
  if (idx >= 0) {
     accounts[idx].username = username; // Update username if they changed it
  } else {
     accounts.push({ userId, username });
  }
  await chrome.storage.local.set({ friendDiffTrackedAccounts: accounts });
}

// Alarm listener removed to enforce 100% safe manual-only scanning!

function calculateUnfollowers(oldList, currentAccumulatedList) {
  if (!oldList || oldList.length === 0) return [];
  const currentIds = new Set(currentAccumulatedList.map(item => item.id));
  const unfollowers = oldList.filter(oldItem => !currentIds.has(oldItem.id));
  return unfollowers;
}

async function sendToBackend(unfollowers) {
  if (unfollowers.length === 0) return;
  const payload = { unfollowers: unfollowers, timestamp: Date.now() };

  try {
    const response = await fetch('http://127.0.0.1:8000/api/unfollowers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      console.log(`Successfully sent ${unfollowers.length} unfollowers to backend.`);
    } else {
      console.error('Backend returned error:', response.status);
    }
  } catch (err) {
    console.error('Failed to communicate with API backend:', err);
  }
}

// Utility to broadcast a log message to the currently active tab (Instagram)
// so the user can see it in F12 without opening the Service Worker console.
function broadcastLog(message, type = "info") {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "BROADCAST_LOG",
        message: message,
        type: type
      }).catch(() => {}); // ignore errors if content script isn't ready
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'REPORT_FRIEND_LIST') {
    const freshBatch = request.data;
    const isEnd = request.isEnd;
    const isFirstPage = request.isFirstPage;
    
    const userId = request.userId;
    const username = request.username;
    
    if (userId) {
      chrome.storage.local.set({ friendDiffUserId: userId }); // Keep for legacy fallback if needed
      if (username) {
        updateTrackedAccounts(userId, username).catch(console.error);
      }
    } else {
      broadcastLog("Error: Missing User ID. Cannot track data.");
      return;
    }

    // We must handle the async diff logic
    (async () => {
      // 1. If this is the FIRST page of a new scan session, clear out the old buffer!
      if (isFirstPage) {
        broadcastLog(`New Scan Session started for @${username || userId}. Clearing buffer.`);
        await clearSessionBuffer(userId);
      }

      // 2. Accumulate the fresh batch into the persisted buffer
      const currentBuffer = await appendToSessionBuffer(userId, freshBatch);
      broadcastLog(`Accumulated ${currentBuffer.length} Followers in current session.`);

      // 3. Diff and report ONLY when we reach the absolute end of the list
      if (isEnd) {
        const oldData = await getSnapshot(userId);
        
        if (oldData && oldData.length > 0) {
          // --- SANITY CHECK: Protect against Network Error / API Rate Limit ---
          // If the scan drops a massive amount of followers suddenly, it's 99% a network error
          // or Instagram cutting off the pagination early. We MUST abort to save the snapshot.
          const missingCount = oldData.length - currentBuffer.length;
          
          // Only apply heuristic if we have a decent sample size AND we actually lost people
          if (oldData.length > 20 && missingCount > 0) {
              const missingRatio = missingCount / oldData.length;
              const MISSING_THRESHOLD = 0.20; // 20% drop is suspicious
              const MAX_FLAT_MISSING = 15;    // Losing 15 at once is suspicious

              if (missingRatio > MISSING_THRESHOLD || missingCount > MAX_FLAT_MISSING) {
                  broadcastLog(`Lỗi mạng/API: Quét bị thiếu ${missingCount} người một cách bất thường. Đã hủy ghi nhận Unfollowers để bảo vệ dữ liệu!`, "error");
                  return; // Abort here, do not overwrite snapshot.
              }
          }
          // --- END SANITY CHECK ---

          const unfollowers = calculateUnfollowers(oldData, currentBuffer);
          if (unfollowers.length > 0) {
            broadcastLog(`Detected ${unfollowers.length} REAL unfollowers! Sending to Python...`, "error");
            
            // 1. Send to Telegram
            await sendToBackend(unfollowers);
            
            // 2. Save to local storage for the Popup UI to read, keyed by userId!
            const historyKey = `unfollowersHistory_${userId}`;
            const stored = await chrome.storage.local.get(historyKey);
            let history = stored[historyKey] || [];
            
            // Prepend new unfollowers with a timestamp
            const now = new Date().toLocaleString();
            const newEntries = unfollowers.map(u => ({ username: u.name || "Unknown", time: now }));
            history = [...newEntries, ...history].slice(0, 50); // Keep last 50
            
            await chrome.storage.local.set({ [historyKey]: history });
            
            // Overwrite snapshot
            await saveSnapshot(userId, currentBuffer);
          } else {
            broadcastLog("Scan complete: No changes detected.");
            if (currentBuffer.length > oldData.length) {
               await saveSnapshot(userId, currentBuffer);
            }
          }
        } else {
          broadcastLog("Initial scan complete. Snapshot saved.");
          await saveSnapshot(userId, currentBuffer);
        }
      }
    })();
  }
});

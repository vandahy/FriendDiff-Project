import { getSnapshot, saveSnapshot } from '../utils/storage.js';

console.log("FriendDiff Background Service Worker initialized.");

// We use chrome.storage.local to persist the buffer across Service Worker Sleeps!
// Manifest V3 kills the SW if idle, clearing global variables like `let sessionBuffer = new Map()`

async function getSessionBuffer() {
  const data = await chrome.storage.local.get(['friendDiffSessionBuffer']);
  return data.friendDiffSessionBuffer || []; // Array of {id, name}
}

async function appendToSessionBuffer(friendsBatch) {
  let existingBuffer = await getSessionBuffer();
  
  // Deduplicate by ID
  const existingIds = new Set(existingBuffer.map(f => f.id));
  friendsBatch.forEach(f => {
    if (!existingIds.has(f.id)) {
      existingBuffer.push(f);
    }
  });

  await chrome.storage.local.set({ friendDiffSessionBuffer: existingBuffer });
  return existingBuffer;
}

async function clearSessionBuffer() {
  await chrome.storage.local.remove(['friendDiffSessionBuffer']);
}

// Create alarm on install/startup (Every 4 hours = 240 minutes)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("friendDiffCron", { periodInMinutes: 1 });
  console.log("FriendDiff: Background Cronjob scheduled (Every 1m).");
});

// Force creation on every SW startup to ensure it runs during dev reloads
chrome.alarms.create("friendDiffCron", { periodInMinutes: 1 });

// Listener for the recurring alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "friendDiffCron") {
    console.log("FriendDiff: Cronjob woke up! Checking for Instagram tabs...");
    
    // Find an active Instagram tab to run the silent scroll
    const tabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
    if (tabs.length > 0) {
      console.log(`FriendDiff: Found ${tabs.length} open Instagram tabs. Injecting silent scanner into tab ${tabs[0].id}.`);
      
      const stored = await chrome.storage.local.get('friendDiffUserId');
      const userId = stored.friendDiffUserId || null;

      // We no longer abort here! We pass `userId` and let the injected script resolve it dynamically!

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        world: "ISOLATED",
        args: [userId],
        func: async (cachedUid) => {
           let uid = cachedUid;
           
           // 1. Fallback: Dynamically resolve User ID if it wasn't captured by the interceptor
           if (!uid) {
               const match = window.location.pathname.match(/^\/([a-zA-Z0-9._]+)\/?/);
               if (match && match[1] !== "explore" && match[1] !== "direct" && match[1] !== "reels") {
                   const username = match[1];
                   console.log(`FriendDiff Cron: Attempting to dynamically resolve User ID for @${username}...`);
                   try {
                       const profileRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
                           headers: { "X-IG-App-ID": "936619743392459" }
                       });
                       if (profileRes.ok) {
                           const profileData = await profileRes.json();
                           uid = profileData?.data?.user?.id;
                           console.log(`FriendDiff Cron: Resolved User ID -> ${uid}`);
                       }
                   } catch(e) {
                       console.error("FriendDiff Cron: Dynamic resolution failed.", e);
                   }
               }
           }

           if (!uid) {
               console.error("FriendDiff Cron: CRITICAL ERROR. Could not determine User ID. Please open the Followers modal manually once.");
               return;
           }

           console.log("FriendDiff Cron: Starting Stealth API Scraper for User ID:", uid);
           
           let maxId = "";
           while (true) {
               try {
                   const url = `https://www.instagram.com/api/v1/friendships/${uid}/followers/?count=50${maxId ? '&max_id='+maxId : ''}`;
                   const res = await fetch(url, { 
                       headers: { "X-IG-App-ID": "936619743392459" }
                   });
                   
                   if (!res.ok) {
                       console.error("FriendDiff Cron: API returned error", res.status);
                       break;
                   }
                   
                   const data = await res.json();
                   let pageFriends = [];
                   if (data.users && Array.isArray(data.users)) {
                       pageFriends = data.users.map(u => ({ id: String(u.pk || u.id), name: u.username }));
                   }
                   
                   const hasNextPage = !!data.next_max_id;
                   const isFirstPage = (maxId === "");
                   
                   // Seamlessly feed data back into the existing content script pipeline
                   if (pageFriends.length > 0 || isFirstPage) {
                       window.dispatchEvent(new CustomEvent('FRIEND_DIFF_DATA', {
                          detail: { friends: pageFriends, hasNextPage: hasNextPage, isFirstPage: isFirstPage }
                       }));
                   }

                   if (hasNextPage) {
                       maxId = data.next_max_id;
                       // Sleep for 1.5s to mimic human UI scrolling and avoid rate limits
                       await new Promise(r => setTimeout(r, 1500));
                   } else {
                       console.log("FriendDiff Cron: Stealth API Scrape completed successfully.");
                       break;
                   }
               } catch (err) {
                   console.error("FriendDiff Cron: Stealth API Scrape completely failed", err);
                   break;
               }
           }
        }
      });
    } else {
      console.log("FriendDiff: No Instagram tabs open. Going back to sleep.");
    }
  }
});

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
    
    if (request.userId) {
      chrome.storage.local.set({ friendDiffUserId: request.userId });
    }

    // We must handle the async diff logic
    (async () => {
      // 1. If this is the FIRST page of a new scan session, clear out the old buffer!
      if (isFirstPage) {
        broadcastLog("New Scan Session started. Clearing buffer.");
        await clearSessionBuffer();
      }

      // 2. Accumulate the fresh batch into the persisted buffer
      const currentBuffer = await appendToSessionBuffer(freshBatch);
      broadcastLog(`Accumulated ${currentBuffer.length} Followers in current session.`);

      // 3. Diff and report ONLY when we reach the absolute end of the list
      if (isEnd) {
        const oldData = await getSnapshot();
        
        if (oldData && oldData.length > 0) {
          const unfollowers = calculateUnfollowers(oldData, currentBuffer);
          if (unfollowers.length > 0) {
            broadcastLog(`Detected ${unfollowers.length} REAL unfollowers! Sending to Python...`, "error");
            
            // 1. Send to Telegram
            await sendToBackend(unfollowers);
            
            // 2. Save to local storage for the Popup UI to read
            const stored = await chrome.storage.local.get("unfollowersHistory");
            let history = stored.unfollowersHistory || [];
            
            // Prepend new unfollowers with a timestamp
            const now = new Date().toLocaleString();
            const newEntries = unfollowers.map(u => ({ username: u.name || "Unknown", time: now }));
            history = [...newEntries, ...history].slice(0, 50); // Keep last 50
            
            await chrome.storage.local.set({ unfollowersHistory: history });
            
            // Overwrite snapshot
            await saveSnapshot(currentBuffer);
          } else {
            broadcastLog("Scan complete: No changes detected.");
            if (currentBuffer.length > oldData.length) {
               await saveSnapshot(currentBuffer);
            }
          }
        } else {
          broadcastLog("Initial scan complete. Snapshot saved.");
          await saveSnapshot(currentBuffer);
        }
      }
    })();
  }
});

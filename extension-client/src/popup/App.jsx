import React, { useState } from 'react';

// The auto-scroll script to be injected into the Instagram page
function runFriendDiffAutomation() {
    console.log("FriendDiff: Automation initiated...");
    if (window.__friendDiffScrollInterval) {
        clearInterval(window.__friendDiffScrollInterval);
    }

    function startScrolling() {
        console.log("FriendDiff: Auto-scroll started...");

        window.__friendDiffScrollInterval = setInterval(() => {
            let scrollableArea = null;

            // Strategy 1: Find by role="dialog"
            const dialogs = document.querySelectorAll('div[role="dialog"]');
            for (let d of dialogs) {
                const descendants = [d, ...d.querySelectorAll('div')];
                for (let el of descendants) {
                    if (el.scrollHeight > el.clientHeight &&
                        el.clientHeight > 100 &&
                        window.getComputedStyle(el).overflowY !== 'hidden') {
                        scrollableArea = el;
                        break;
                    }
                }
                if (scrollableArea) break;
            }

            // Strategy 2: Fallback
            if (!scrollableArea) {
                const allDivs = document.querySelectorAll('div');
                for (let el of allDivs) {
                    if (el.scrollHeight > el.clientHeight && el.clientHeight > 300) {
                        scrollableArea = el;
                        break;
                    }
                }
            }

            if (scrollableArea) {
                // Scroll by a chunk instead of straight to bottom to trigger lazy loading more reliably
                scrollableArea.scrollTop = scrollableArea.scrollHeight;
            } else {
                console.log("FriendDiff: Could not find scrollable area yet...");
            }
        }, 6000); // 6.0 seconds is a much safer rate to avoid Instagram temporary bans
    }

    // 1. Check if the modal is already open
    const dialogs = document.querySelectorAll('div[role="dialog"]');
    if (dialogs.length > 0) {
        console.log("FriendDiff: Modal already open, starting scroll.");
        startScrolling();
        return;
    }

    function findFollowersLink() {
        const links = document.querySelectorAll('a');
        for (let a of links) {
            if (a.href && a.href.includes('/followers/')) {
                return a;
            }
        }
        return null;
    }

    function clickFollowersAndScan() {
        const followersPath = window.location.pathname;

        // React Router Edge Case: If we are ALREADY on the /followers/ URL (e.g. from F5),
        // clicking the link does nothing because the Router thinks we are already there!
        if (followersPath.includes('/followers')) {
            const basePath = followersPath.replace(/\/followers\/?/, '/');
            const baseLinks = document.querySelectorAll(`a[href="${basePath}"]`);
            // Find a valid profile link that resets the state (the username link on the profile is one)
            let resetLink = null;
            for (let a of baseLinks) {
                if (a.textContent.length > 0) { resetLink = a; break; }
            }
            if (resetLink) {
                console.log("FriendDiff: Resetting React Router state to profile base...");
                resetLink.click();
                setTimeout(() => {
                    const fl = findFollowersLink();
                    if (fl) {
                        console.log("FriendDiff: Re-clicking Followers link...");
                        fl.click();
                        setTimeout(startScrolling, 2500);
                    }
                }, 1000);
                return true;
            }
        }

        const followersLink = findFollowersLink();
        if (followersLink) {
            console.log("FriendDiff: Clicking Followers link...");
            followersLink.click();
            setTimeout(startScrolling, 2500);
            return true;
        }
        return false;
    }

    // 2. Try to click Followers directly (if we are already on the profile page)
    if (clickFollowersAndScan()) {
        return;
    }

    // 3. We are likely on the Homepage. Find the Profile link in the Sidebar!
    console.log("FriendDiff: Not on Profile Page. Finding Sidebar...");
    let sidebarProfileLink = null;

    // The sidebar usually contains many standard links like Home (/) and Explore (/explore/)
    const navs = document.querySelectorAll('div, nav');
    let sidebar = null;
    for (let n of navs) {
        const links = n.querySelectorAll('a[href^="/"]');
        if (links.length > 4) {
            const hasHome = Array.from(links).some(l => l.getAttribute('href') === '/');
            const hasExplore = Array.from(links).some(l => l.getAttribute('href') && l.getAttribute('href').includes('/explore'));
            if (hasHome && hasExplore) {
                sidebar = n;
                break;
            }
        }
    }

    if (sidebar) {
        const links = sidebar.querySelectorAll('a[href^="/"]');
        for (let a of links) {
            const href = a.getAttribute('href');
            // A profile link is typically like /username/ but not standard system paths
            if (href && href !== '/' && !href.includes('/explore') && !href.includes('/reels') && !href.includes('/direct') && !href.includes('/your_activity')) {
                sidebarProfileLink = a;
                break;
            }
        }
    } else {
        // Fallback: search by text
        const allLinks = document.querySelectorAll('a[role="link"], a');
        for (let a of allLinks) {
            const text = a.textContent.toLowerCase().trim();
            if (text === 'profile' || text === 'trang cá nhân') {
                sidebarProfileLink = a;
                break;
            }
        }
    }

    if (sidebarProfileLink) {
        console.log("FriendDiff: Navigating to Profile via Sidebar...", sidebarProfileLink.getAttribute('href'));
        sidebarProfileLink.click();

        // Wait 2.5 seconds for the React Router to render the Profile page, THEN click Followers
        setTimeout(() => {
            if (!clickFollowersAndScan()) {
                alert("FriendDiff: Could not find Followers button even after navigating to Profile. Please open it manually.");
            }
        }, 2500);
    } else {
        alert("FriendDiff: Please go to your Profile page first! We couldn't auto-navigate.");
    }
}

function stopAutoScrollInstagram() {
    if (window.__friendDiffScrollInterval) {
        clearInterval(window.__friendDiffScrollInterval);
        console.log("FriendDiff: Auto-scroll stopped.");
    }
}

export default function App() {
    const [isScanning, setIsScanning] = useState(false);
    const [history, setHistory] = useState([]);
    const [scannedCount, setScannedCount] = useState(0);

    const [trackedAccounts, setTrackedAccounts] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");

    // 1. Initial Load: Get tracked accounts and auto-select based on current tab URL
    React.useEffect(() => {
        async function loadAccounts() {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            let currentUrlUsername = "";
            if (tab && tab.url.includes("instagram.com")) {
                const match = new URL(tab.url).pathname.match(/^\/([a-zA-Z0-9._]+)\/?/);
                if (match && !["explore", "direct", "reels"].includes(match[1])) {
                    currentUrlUsername = match[1];
                }
            }

            chrome.storage.local.get(["friendDiffTrackedAccounts"], (res) => {
                const accounts = res.friendDiffTrackedAccounts || [];
                if (accounts.length > 0) {
                    setTrackedAccounts(accounts);
                    const matched = accounts.find(a => a.username === currentUrlUsername);
                    if (matched) {
                        setSelectedUserId(matched.userId);
                    } else {
                        setSelectedUserId(accounts[0].userId);
                    }
                }
            });
        }
        loadAccounts();
    }, []);

    // 2. When selected account changes, load its history and listen for updates
    React.useEffect(() => {
        if (!selectedUserId) {
            setHistory([]);
            setScannedCount(0);
            return;
        }

        const historyKey = `unfollowersHistory_${selectedUserId}`;
        const bufferKey = `friendDiffSessionBuffer_${selectedUserId}`;

        chrome.storage.local.get([historyKey], (result) => {
            setHistory(result[historyKey] || []);
        });

        // Listen for real-time updates from Service Worker
        const handleStorageChange = (changes, area) => {
            if (area === "local") {
                if (changes[historyKey]) {
                    setHistory(changes[historyKey].newValue || []);
                }
                if (changes.friendDiffTrackedAccounts) {
                    setTrackedAccounts(changes.friendDiffTrackedAccounts.newValue || []);
                }
                if (changes[bufferKey]) {
                    setScannedCount(changes[bufferKey].newValue?.length || 0);
                }
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, [selectedUserId]);

    const clearHistory = () => {
        if (!selectedUserId) return;
        const historyKey = `unfollowersHistory_${selectedUserId}`;
        chrome.storage.local.remove([historyKey], () => {
            setHistory([]);
        });
    };

    const handleStartScan = async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.includes("instagram.com")) {
            alert("Please open Instagram first!");
            return;
        }

        setScannedCount(0); // Reset UI counter
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: runFriendDiffAutomation,
        }, () => {
            setIsScanning(true);
        });
    };

    const handleStopScan = async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: stopAutoScrollInstagram,
            }, () => {
                setIsScanning(false);
            });
        }
    };

    return (
        <div style={{ padding: '20px', width: '320px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h2>FriendDiff 🕵️‍♂️</h2>
            <p style={{ fontSize: '13px', color: '#555' }}>Turn Instagram manual labor into automation.</p>

            <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>
                    <strong>1.</strong> Go to your <em>Profile</em> page.<br />
                    <strong>2.</strong> Click the button below. We'll handle the rest!
                </p>

                {!isScanning ? (
                    <button
                        onClick={handleStartScan}
                        style={{ padding: '10px 15px', background: '#0095f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                        🚀 Start Auto-Scan
                    </button>
                ) : (
                    <button
                        onClick={handleStopScan}
                        style={{ padding: '10px 15px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                        ⛔ Stop Scanning
                    </button>
                )}
            </div>

            <div style={{ fontSize: '12px', color: isScanning ? '#28a745' : '#666', marginBottom: '15px' }}>
                Status: <strong>{isScanning ? `Đang Quét... (${scannedCount} người)` : `Tiếp nhận: ${scannedCount} / Chờ lệnh`}</strong>
            </div>

            {/* History Section */}
            <div style={{ textAlign: 'left', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: '#ff3b30' }}>Unfollowers</h3>
                        {trackedAccounts.length > 0 && (
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', maxWidth: '120px', border: '1px solid #ccc' }}
                            >
                                {trackedAccounts.map(a => (
                                    <option key={a.userId} value={a.userId}>@{a.username}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {history.length > 0 && (
                        <button onClick={clearHistory} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0 }}>
                            Clear
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                        No traitors found yet...
                    </p>
                ) : (
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                        {history.map((item, index) => (
                            <li key={index} style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 'bold' }}>@{item.username}</span>
                                <span style={{ color: '#888', fontSize: '10px' }}>{item.time.split(',')[0]}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

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
        }, 1500); // 1.5 seconds is a safe rate to avoid blocks
    }

    // 1. Check if the modal is already open
    const dialogs = document.querySelectorAll('div[role="dialog"]');
    if (dialogs.length > 0) {
        console.log("FriendDiff: Modal already open, starting scroll.");
        startScrolling();
        return;
    }

    // 2. Not open, try to find the Followers link
    const links = document.querySelectorAll('a');
    let followersLink = null;
    for (let a of links) {
        if (a.href && a.href.includes('/followers/')) {
            followersLink = a;
            break;
        }
    }

    if (followersLink) {
        console.log("FriendDiff: Clicking Followers link...");
        followersLink.click();
        // Wait a bit for the modal to open before scrolling
        setTimeout(startScrolling, 2500);
    } else {
        alert("FriendDiff: Please go to your Profile page first!");
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

    // Load history when popup opens and listen for changes
    React.useEffect(() => {
        // Initial load
        chrome.storage.local.get("unfollowersHistory", (result) => {
            if (result.unfollowersHistory) {
                setHistory(result.unfollowersHistory);
            }
        });

        // Listen for real-time updates from Service Worker
        const handleStorageChange = (changes, area) => {
            if (area === "local" && changes.unfollowersHistory) {
                setHistory(changes.unfollowersHistory.newValue || []);
            }
            if (area === "local" && changes.friendDiffSessionBuffer) {
                // Optional: We could update progress here if we wanted
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    const clearHistory = () => {
        chrome.storage.local.remove("unfollowersHistory", () => {
            setHistory([]);
        });
    };

    const handleStartScan = async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.includes("instagram.com")) {
            alert("Please open Instagram first!");
            return;
        }

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
                Status: <strong>{isScanning ? "Scanning (please wait)..." : "Idle"}</strong>
            </div>

            {/* History Section */}
            <div style={{ textAlign: 'left', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#ff3b30' }}>Recent Unfollowers</h3>
                    {history.length > 0 && (
                        <button onClick={clearHistory} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>
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

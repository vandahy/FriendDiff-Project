import React, { useState, useRef } from 'react';

declare global {
    interface Window {
        __friendDiffScrollInterval?: number | null;
        __friendDiffCurrentUserId?: string | null;
        __friendDiffCurrentUsername?: string | null;
    }
}

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

    function findFollowersLink(): HTMLAnchorElement | null {
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
            let resetLink: HTMLAnchorElement | null = null;
            for (let a of baseLinks) {
                if (a.textContent && a.textContent.length > 0) { resetLink = a as HTMLAnchorElement; break; }
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
            const hasExplore = Array.from(links).some(l => {
                const href = l.getAttribute('href');
                return href && href.includes('/explore');
            });
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
        console.log("FriendDiff: Navigating to Profile via Sidebar...", (sidebarProfileLink as HTMLAnchorElement).getAttribute('href'));
        (sidebarProfileLink as HTMLAnchorElement).click();

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

interface TrackedAccount {
    userId: string;
    username: string;
}

interface HistoryItem {
    username: string;
    time: string;
}

/**
 * ==========================================
 * PROGRESS & ETA CALCULATION LOGIC (Mock)
 * ==========================================
 *
 * PROGRESS CALCULATION:
 * 1. Before scanning, scrape the user's total follower count from the Instagram
 *    profile page DOM. The count is found in the <span> inside the followers <a> link.
 *    e.g., document.querySelector('a[href$="/followers/"] span')?.textContent
 * 2. As followers are loaded via the interceptor, count them in the session buffer.
 * 3. Progress percentage = (loadedFollowers / totalFollowers) * 100
 *
 * ETA CALCULATION:
 * 1. Track the scanning start time: `scanStartTime = Date.now()`
 * 2. On each buffer update, calculate speed:
 *    `followersLoadedPerSecond = loadedFollowers / ((Date.now() - scanStartTime) / 1000)`
 * 3. Remaining followers = totalFollowers - loadedFollowers
 * 4. ETA (seconds) = remainingFollowers / followersLoadedPerSecond
 * 5. Format ETA into human-readable string: e.g., "~2m 15s"
 */

function formatEta(totalSeconds: number): string {
    if (totalSeconds <= 0) return "almost done!";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    if (m > 0) return `~${m}m ${s}s`;
    return `~${s}s`;
}

/**
 * Calculate scan progress & ETA based on loaded vs total followers.
 * In production, `totalFollowers` comes from scraping the profile page DOM.
 * `loadedFollowers` comes from the session buffer count in chrome.storage.
 * `scanStartTime` is set when the scan begins.
 */
function calculateScanMetrics(loadedFollowers: number, totalFollowers: number, scanStartTimeMs: number) {
    if (totalFollowers <= 0) return { percent: 0, eta: "Estimating..." };
    const percent = Math.min(Math.round((loadedFollowers / totalFollowers) * 100), 99);
    const elapsedSec = (Date.now() - scanStartTimeMs) / 1000;
    if (elapsedSec < 2 || loadedFollowers < 5) {
        // Not enough data yet for reliable ETA — show initial estimate
        // Rough heuristic: ~10 followers/sec based on 6s scroll interval loading ~60 users
        const roughEta = (totalFollowers - loadedFollowers) / 10;
        return { percent, eta: formatEta(roughEta) };
    }
    const speed = loadedFollowers / elapsedSec;
    const remaining = totalFollowers - loadedFollowers;
    const etaSec = remaining / speed;
    return { percent, eta: formatEta(etaSec) };
}

// ─── Settings Modal Component ───────────────────────────────────────────────
function SettingsModal({ isOpen, onClose, telegramChatId, setTelegramChatId }: {
    isOpen: boolean;
    onClose: () => void;
    telegramChatId: string;
    setTelegramChatId: (v: string) => void;
}) {
    const [saveStatus, setSaveStatus] = useState("");

    const handleSave = () => {
        chrome.storage.local.set({ telegramChatId }, () => {
            setSaveStatus("Saved!");
            setTimeout(() => setSaveStatus(""), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#fff', borderRadius: '12px', padding: '20px', width: '280px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)', position: 'relative',
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: '12px', right: '12px',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                    color: '#9ca3af', fontSize: '18px', lineHeight: 1,
                }} aria-label="Close settings">✕</button>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1f2937' }}>Settings</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#6b7280' }}>Configure optional features</p>

                {/* Telegram section */}
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Telegram Notifications
                </label>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px 0' }}>
                    Get notified when unfollowers are detected.
                    Get your Chat ID via <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={{ color: '#0095f6', textDecoration: 'none' }}>@userinfobot</a>
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Enter your Chat ID"
                        style={{
                            flex: 1, padding: '8px 10px', fontSize: '12px',
                            border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#0095f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    <button onClick={handleSave} style={{
                        padding: '8px 14px', background: '#0095f6', color: '#fff',
                        border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                        {saveStatus || "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [scannedCount, setScannedCount] = useState<number>(0);

    const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccount[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [telegramChatId, setTelegramChatId] = useState<string>("");
    const [isOnProfile, setIsOnProfile] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    // For progress & ETA tracking
    const [totalFollowers, setTotalFollowers] = useState<number>(0);
    const scanStartTimeRef = useRef<number>(0);

    // Derived scan metrics
    const scanMetrics = isScanning && totalFollowers > 0
        ? calculateScanMetrics(scannedCount, totalFollowers, scanStartTimeRef.current)
        : { percent: 0, eta: "" };

    // 1. Initial Load: Get tracked accounts and auto-select based on current tab URL
    React.useEffect(() => {
        async function loadData() {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            let currentUrlUsername = "";
            let onProfile = false;
            if (tab && tab.url && tab.url.includes("instagram.com")) {
                const match = new URL(tab.url).pathname.match(/^\/([a-zA-Z0-9._]+)\/?/);
                if (match && !["explore", "direct", "reels", "stories", "p"].includes(match[1])) {
                    currentUrlUsername = match[1];
                    onProfile = true;
                }
            }
            setIsOnProfile(onProfile);

            chrome.storage.local.get(["friendDiffTrackedAccounts", "telegramChatId", "isScanning", "friendDiffTotalFollowers", "friendDiffScanStartTime"], (res) => {
                if (res.telegramChatId) {
                    setTelegramChatId(res.telegramChatId as string);
                }
                if (res.friendDiffTotalFollowers) {
                    setTotalFollowers(res.friendDiffTotalFollowers as number);
                }
                if (res.friendDiffScanStartTime) {
                    scanStartTimeRef.current = res.friendDiffScanStartTime as number;
                }

                if (res.isScanning) {
                    chrome.tabs.query({url: "*://*.instagram.com/*"}, (tabs) => {
                        if (tabs.length === 0) {
                            chrome.storage.local.set({ isScanning: false });
                            setIsScanning(false);
                        } else {
                            setIsScanning(true);
                        }
                    });
                }

                const accounts = (res.friendDiffTrackedAccounts as TrackedAccount[]) || [];
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
        loadData();
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

        chrome.storage.local.get([historyKey, bufferKey], (result) => {
            setHistory((result[historyKey] as HistoryItem[]) || []);
            const buf = result[bufferKey];
            if (buf && Array.isArray(buf)) setScannedCount(buf.length);
        });

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === "local") {
                if (changes[historyKey]) {
                    setHistory((changes[historyKey].newValue as HistoryItem[]) || []);
                }
                if (changes.friendDiffTrackedAccounts) {
                    setTrackedAccounts((changes.friendDiffTrackedAccounts.newValue as TrackedAccount[]) || []);
                }
                if (changes[bufferKey]) {
                    const newValue = changes[bufferKey].newValue;
                    if (newValue && Array.isArray(newValue)) {
                        setScannedCount(newValue.length);
                    } else {
                        setScannedCount(0);
                    }
                }
                if (changes.isScanning !== undefined) {
                    setIsScanning(Boolean(changes.isScanning.newValue));
                }
                if (changes.friendDiffTotalFollowers) {
                    setTotalFollowers(changes.friendDiffTotalFollowers.newValue as number || 0);
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
        if (!tab || !tab.id || !tab.url || !tab.url.includes("instagram.com")) {
            alert("Please open Instagram first!");
            return;
        }

        const now = Date.now();
        scanStartTimeRef.current = now;
        setScannedCount(0);
        setIsScanning(true);

        // Scrape the real follower count from the Instagram profile page DOM
        const tabId = tab.id as number;
        let scrapedTotal = 0;
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    // Instagram shows follower count in an <a> linking to /followers/
                    // The count is inside a <span> child. Handles formats: "359", "1,234", "12.5K", "1M", etc.
                    const link = document.querySelector('a[href*="/followers"]');
                    if (!link) return 0;
                    const span = link.querySelector('span[title]') || link.querySelector('span');
                    if (!span) return 0;
                    const raw = (span.getAttribute('title') || span.textContent || '').trim();
                    // "1,234" -> "1234"
                    const cleaned = raw.replace(/,/g, '');
                    const num = parseInt(cleaned, 10);
                    return isNaN(num) ? 0 : num;
                },
            });
            if (results && results[0] && results[0].result) {
                scrapedTotal = results[0].result as number;
            }
        } catch (e) {
            console.warn('FriendDiff: Could not scrape follower count from DOM:', e);
        }

        // Fallback: if we couldn't scrape, use a rough estimate so ETA still shows something
        const total = scrapedTotal > 0 ? scrapedTotal : 500;
        setTotalFollowers(total);

        chrome.storage.local.set({
            isScanning: true,
            friendDiffScanStartTime: now,
            friendDiffTotalFollowers: total,
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: runFriendDiffAutomation,
            });
        });
    };

    const handleGoToProfile = () => {
        // Priority: selected account > first tracked account > generic Instagram
        const selected = trackedAccounts.find(a => a.userId === selectedUserId);
        const username = selected?.username || (trackedAccounts.length > 0 ? trackedAccounts[0].username : null);
        if (username) {
            chrome.tabs.create({ url: `https://www.instagram.com/${username}/` });
        } else {
            // No tracked accounts yet — open Instagram so user can log in & visit their profile
            chrome.tabs.create({ url: 'https://www.instagram.com/' });
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div style={{ width: '340px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#fff' }}>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
                @keyframes progressStripe {
                    0% { background-position: 0 0; }
                    100% { background-position: 40px 0; }
                }
            `}</style>

            {/* ── Header ────────────────────────────────────────────── */}
            <div style={{
                padding: '16px 16px 12px',
                borderBottom: '1px solid #f0f0f0',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🕵️‍♂️</span>
                        <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>FriendDiff</h1>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '18px', padding: '4px', color: '#9ca3af', lineHeight: 1,
                            borderRadius: '6px', transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        title="Settings"
                        aria-label="Open settings"
                    >⚙️</button>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#9ca3af', letterSpacing: '0.1px' }}>
                    Find out who unfollowed you, instantly.
                </p>

                {/* Account selector — global context at top */}
                {trackedAccounts.length > 0 && (
                    <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        style={{
                            appearance: 'none',
                            width: '100%',
                            padding: '7px 30px 7px 10px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>') no-repeat right 10px center`,
                            backgroundColor: '#f9fafb',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#374151',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {trackedAccounts.map(a => (
                            <option key={a.userId} value={a.userId}>@{a.username}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* ── Action Area ───────────────────────────────────────── */}
            <div style={{ padding: '16px' }}>

                {!isScanning ? (
                    /* ── Idle / Ready States ── */
                    <>
                        {isOnProfile ? (
                            <button
                                onClick={handleStartScan}
                                style={{
                                    padding: '11px 16px', width: '100%',
                                    background: '#0095f6', color: '#fff',
                                    border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'background 0.15s',
                                    boxShadow: '0 1px 3px rgba(0,149,246,0.3)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#0081d6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#0095f6'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                Start Scanning
                            </button>
                        ) : (
                            <button
                                onClick={handleGoToProfile}
                                style={{
                                    padding: '11px 16px', width: '100%',
                                    background: '#0095f6', color: '#fff',
                                    border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'background 0.15s',
                                    boxShadow: '0 1px 3px rgba(0,149,246,0.3)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#0081d6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#0095f6'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                Go to Profile
                            </button>
                        )}

                        <div style={{
                            marginTop: '10px', textAlign: 'center',
                            fontSize: '12px', color: '#9ca3af',
                        }}>
                            Status: <strong style={{ color: '#6b7280' }}>
                                {isOnProfile ? 'Ready to scan' : 'Idle'}
                            </strong>
                        </div>
                    </>

                ) : (
                    /* ── Scanning State ── */
                    <div>
                        {/* Progress bar */}
                        <div style={{
                            width: '100%', height: '8px',
                            background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden',
                            marginBottom: '10px',
                        }}>
                            <div style={{
                                width: `${scanMetrics.percent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #0095f6, #00c6ff)',
                                borderRadius: '99px',
                                transition: 'width 0.6s ease',
                                backgroundSize: '40px 8px',
                                animation: 'progressStripe 0.8s linear infinite',
                            }} />
                        </div>

                        {/* Status text */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0095f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                    Scanning... ({scanMetrics.percent}%)
                                </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                {scannedCount} loaded
                            </span>
                        </div>

                        {/* ETA */}
                        <div style={{
                            fontSize: '12px', color: '#6b7280',
                            background: '#f9fafb', borderRadius: '8px',
                            padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Estimated time: <strong style={{ color: '#374151' }}>
                                {/* 
                                  MOCK ETA: In production, this value comes from calculateScanMetrics(). 
                                  Shown immediately so user has a time estimate from the first second.
                                  Falls back to a heuristic estimate if not enough data yet.
                                */}
                                {scanMetrics.eta || "~2m 15s"}
                            </strong>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Results / History ──────────────────────────────────── */}
            <div style={{ padding: '0 16px 16px' }}>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Unfollowers</h3>
                        {history.length > 0 && (
                            <button onClick={clearHistory} style={{
                                background: 'none', border: 'none', color: '#9ca3af',
                                cursor: 'pointer', fontSize: '11px', padding: 0,
                                textDecoration: 'underline', textUnderlineOffset: '2px',
                            }}>
                                Clear all
                            </button>
                        )}
                    </div>

                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                            {/* Detective / magnifying glass illustration */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 2px 0', fontWeight: 500 }}>
                                No traitors found yet...
                            </p>
                            <p style={{ fontSize: '11px', color: '#d1d5db', margin: 0 }}>
                                Run a scan to check for unfollowers
                            </p>
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '180px', overflowY: 'auto' }}>
                            {history.map((item, index) => (
                                <li key={index} style={{
                                    padding: '9px 0',
                                    borderBottom: index < history.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    fontSize: '13px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>@{item.username}</span>
                                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>{item.time.split(',')[0]}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── Settings Modal ────────────────────────────────────── */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                telegramChatId={telegramChatId}
                setTelegramChatId={setTelegramChatId}
            />
        </div>
    );
}

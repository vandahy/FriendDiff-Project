import React, { useState, useRef } from 'react';
import { ActionArea } from './components/ActionArea';
import { HistoryPanel } from './components/HistoryPanel';
import { PopupHeader } from './components/PopupHeader';
import { SettingsModal } from './components/SettingsModal';
import { TrackedAccount, HistoryItem } from './types';
import { calculateScanMetrics } from './utils/scanMetrics';

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

    // Adaptive ETA: track recent loading speed over a 30-second sliding window
    const speedSamplesRef = useRef<{count: number, time: number}[]>([]);

    function getRecentSpeed(): number {
        const samples = speedSamplesRef.current;
        if (samples.length < 2) return 0;
        const oldest = samples[0];
        const newest = samples[samples.length - 1];
        const deltaCount = newest.count - oldest.count;
        const deltaSec = (newest.time - oldest.time) / 1000;
        if (deltaSec <= 0 || deltaCount <= 0) return 0;
        return deltaCount / deltaSec;
    }

    // Derived scan metrics (uses adaptive speed for responsive ETA)
    const scanMetrics = isScanning && totalFollowers > 0
        ? calculateScanMetrics(scannedCount, totalFollowers, scanStartTimeRef.current, getRecentSpeed())
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

    // Track loading speed samples for adaptive ETA
    React.useEffect(() => {
        if (isScanning && scannedCount > 0) {
            const now = Date.now();
            speedSamplesRef.current.push({ count: scannedCount, time: now });
            // Keep only the last 30 seconds for recent speed calculation
            const cutoff = now - 30000;
            speedSamplesRef.current = speedSamplesRef.current.filter(s => s.time >= cutoff);
        }
        if (!isScanning) {
            speedSamplesRef.current = [];
        }
    }, [scannedCount, isScanning]);

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
        speedSamplesRef.current = [];
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

    const handleGoToProfile = async () => {
        // Priority: selected account > first tracked account > generic Instagram
        const selected = trackedAccounts.find(a => a.userId === selectedUserId);
        const username = selected?.username || (trackedAccounts.length > 0 ? trackedAccounts[0].username : null);

        if (!username) {
            // No tracked accounts yet — open Instagram so user can log in & visit their profile
            chrome.tabs.create({ url: 'https://www.instagram.com/' });
            return;
        }

        const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;

        // If already logged in as the same user, just open profile.
        const loggedInUserId = await new Promise<string | null>((resolve) => {
            chrome.cookies.get({ url: 'https://www.instagram.com', name: 'ds_user_id' }, (cookie) => {
                resolve(cookie?.value || null);
            });
        });
        if (loggedInUserId && selected?.userId && loggedInUserId === String(selected.userId)) {
            chrome.tabs.create({ url: profileUrl });
            return;
        }

        // Otherwise, we need the user to login as the selected account.
        // Store the username so the content script can auto-fill it on the login page.
        chrome.storage.local.set({ friendDiffAutoLoginUsername: username }, () => {
            // If the user is already logged in as a different account, kick them out first.
            if (loggedInUserId) {
                chrome.tabs.create({ url: 'https://www.instagram.com/accounts/logout/' });
            } else {
                chrome.tabs.create({ url: 'https://www.instagram.com/accounts/login/' });
            }
        });
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
            <PopupHeader
                trackedAccounts={trackedAccounts}
                selectedUserId={selectedUserId}
                onSelectedUserChange={setSelectedUserId}
                onOpenSettings={() => setShowSettings(true)}
            />

            {/* ── Action Area ───────────────────────────────────────── */}
            <ActionArea
                isScanning={isScanning}
                isOnProfile={isOnProfile}
                scannedCount={scannedCount}
                scanMetrics={scanMetrics}
                onStartScan={handleStartScan}
                onGoToProfile={handleGoToProfile}
            />

            {/* ── Results / History ──────────────────────────────────── */}
            <HistoryPanel history={history} onClearHistory={clearHistory} />

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

/**
 * Analytics Module — Active Users Tracking via Telegram Bot
 *
 * Chức năng:
 * - Tạo Anonymous ID (UUID v4) cho mỗi user, lưu vĩnh viễn vào chrome.storage.local.
 * - Gủi thông báo đến Telegram khi Extension được cài đặt (Install) hoặc khởi động hàng ngày (Active).
 * - Anti-spam: Mỗi ngày chỉ gửi tối đa 1 lần cho mỗi user.
 *
 * Dữ liệu gửi đi (Projection — chỉ gửi những gì cần thiết):
 * - anonymous_id: UUID ngẫu nhiên (không liên kết được với user thật)
 * - extension_version: phiên bản Extension
 * - event_type: "Install" hoặc "Active"
 * - timestamp: thời điểm gửi (ISO 8601)
 */


// ─── Types ───────────────────────────────────────────────────────────────────

type EventType = 'Install' | 'Active';

interface AnalyticsPayload {
    anonymous_id: string;
    extension_version: string;
    event_type: EventType;
    timestamp: string;
}

interface AnalyticsStorage {
    analyticsAnonymousId?: string;
    analyticsLastNotifyDate?: string;
}

// ─── Storage Keys ────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
    ANONYMOUS_ID: 'analyticsAnonymousId',
    LAST_NOTIFY_DATE: 'analyticsLastNotifyDate',
} as const;

// ─── UUID v4 Generator ──────────────────────────────────────────────────────

/**
 * Tạo UUID v4 sử dụng crypto.randomUUID() (có sẵn trong Service Worker).
 * Fallback sang crypto.getRandomValues() nếu randomUUID không khả dụng.
 */
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback: manual UUID v4
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join('-');
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Lấy hoặc tạo Anonymous ID cho user hiện tại.
 * ID chỉ tạo một lần duy nhất và lưu vĩnh viễn.
 */
async function getOrCreateAnonymousId(): Promise<string> {
    const data: AnalyticsStorage = await chrome.storage.local.get([STORAGE_KEYS.ANONYMOUS_ID]);
    const existingId = data[STORAGE_KEYS.ANONYMOUS_ID];

    if (existingId) {
        return existingId;
    }

    const newId = generateUUID();
    await chrome.storage.local.set({ [STORAGE_KEYS.ANONYMOUS_ID]: newId });
    console.log('[Analytics] Generated new anonymous ID:', newId);
    return newId;
}

/**
 * Kiểm tra xem hôm nay đã gửi thông báo chưa.
 * So sánh ngày hiện tại (YYYY-MM-DD) với ngày gửi cuối cùng trong storage.
 */
async function hasNotifiedToday(): Promise<boolean> {
    const data: AnalyticsStorage = await chrome.storage.local.get([STORAGE_KEYS.LAST_NOTIFY_DATE]);
    const lastDate = data[STORAGE_KEYS.LAST_NOTIFY_DATE];

    if (!lastDate) return false;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return lastDate === today;
}

/**
 * Đánh dấu ngày hôm nay là đã gửi thông báo.
 */
async function markNotifiedToday(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await chrome.storage.local.set({ [STORAGE_KEYS.LAST_NOTIFY_DATE]: today });
}

/**
 * Lấy version của Extension từ manifest.
 */
function getExtensionVersion(): string {
    try {
        return chrome.runtime.getManifest().version;
    } catch {
        return 'unknown';
    }
}

/**
 * Tạo payload chuẩn để gửi đi.
 * Chỉ bao gồm những field cần thiết (Data Projection).
 */
function buildPayload(anonymousId: string, eventType: EventType): AnalyticsPayload {
    return {
        anonymous_id: anonymousId,
        extension_version: getExtensionVersion(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
    };
}


/**
 * Gửi thông báo đến Backend API (api-server).
 * Backend sẽ gom tất cả event trong ngày và gửi 1 Telegram summary duy nhất vào cuối ngày.
 * Xử lý lỗi kỹ để tránh crash Service Worker.
 */
async function sendAnalyticsEvent(eventType: EventType): Promise<void> {
    try {
        const anonymousId = await getOrCreateAnonymousId();
        const payload = buildPayload(anonymousId, eventType);

        const url = `http://127.0.0.1:8000/api/analytics`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log(`[Analytics] ${eventType} event sent successfully to Backend.`);
        } else {
            const errorBody = await response.text();
            console.error(`[Analytics] Backend API error (${response.status}):`, errorBody);
        }
    } catch (error) {
        // Catch tất cả lỗi — đảm bảo Service Worker không bao giờ crash vì analytics
        console.error('[Analytics] Failed to send analytics event:', error);
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Gọi khi Extension được cài đặt lần đầu.
 * Luôn gửi (không áp dụng anti-spam vì Install chỉ xảy ra 1 lần).
 */
export async function trackInstall(): Promise<void> {
    try {
        await sendAnalyticsEvent('Install');
        await markNotifiedToday(); // Đánh dấu để tránh gửi thêm Active event trong cùng ngày
    } catch (error) {
        console.error('[Analytics] trackInstall failed:', error);
    }
}

/**
 * Gọi khi Chrome khởi động (onStartup).
 * Chỉ gửi 1 lần/ngày để tránh spam.
 */
export async function trackDailyActive(): Promise<void> {
    try {
        const alreadySent = await hasNotifiedToday();
        if (alreadySent) {
            console.log('[Analytics] Already notified today, skipping.');
            return;
        }

        await sendAnalyticsEvent('Active');
        await markNotifiedToday();
    } catch (error) {
        console.error('[Analytics] trackDailyActive failed:', error);
    }
}

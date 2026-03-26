import { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    telegramChatId: string;
    setTelegramChatId: (v: string) => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    telegramChatId,
    setTelegramChatId,
}: SettingsModalProps) {
    const [saveStatus, setSaveStatus] = useState('');

    const handleSave = () => {
        chrome.storage.local.set({ telegramChatId }, () => {
            setSaveStatus('Saved!');
            setTimeout(() => setSaveStatus(''), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    width: '280px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                    position: 'relative',
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#9ca3af',
                        fontSize: '18px',
                        lineHeight: 1,
                    }}
                    aria-label="Close settings"
                >
                    ✕
                </button>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1f2937' }}>Settings</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#6b7280' }}>Configure optional features</p>

                <label
                    style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'block',
                        marginBottom: '4px',
                    }}
                >
                    Telegram Notifications
                </label>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px 0' }}>
                    Get notified when unfollowers are detected. Get your Chat ID via{' '}
                    <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#0095f6', textDecoration: 'none' }}
                    >
                        @userinfobot
                    </a>
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Enter your Chat ID"
                        style={{
                            flex: 1,
                            padding: '8px 10px',
                            fontSize: '12px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0095f6';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                    />
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '8px 14px',
                            background: '#0095f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {saveStatus || 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

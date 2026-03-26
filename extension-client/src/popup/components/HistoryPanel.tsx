import { HistoryItem } from '../types';

interface HistoryPanelProps {
    history: HistoryItem[];
    onClearHistory: () => void;
}

export function HistoryPanel({ history, onClearHistory }: HistoryPanelProps) {
    return (
        <div style={{ padding: '0 16px 16px' }}>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Unfollowers</h3>
                    {history.length > 0 && (
                        <button
                            onClick={onClearHistory}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: 0,
                                textDecoration: 'underline',
                                textUnderlineOffset: '2px',
                            }}
                        >
                            Clear all
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#d1d5db"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginBottom: '10px' }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
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
                            <li
                                key={index}
                                style={{
                                    padding: '9px 0',
                                    borderBottom: index < history.length - 1 ? '1px solid #f5f5f5' : 'none',
                                    fontSize: '13px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span style={{ fontWeight: 600, color: '#1f2937' }}>@{item.username}</span>
                                <span style={{ color: '#9ca3af', fontSize: '11px' }}>{item.time.split(',')[0]}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

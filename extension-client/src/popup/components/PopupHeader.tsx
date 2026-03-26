import { TrackedAccount } from '../types';

interface PopupHeaderProps {
    trackedAccounts: TrackedAccount[];
    selectedUserId: string;
    onSelectedUserChange: (userId: string) => void;
    onOpenSettings: () => void;
}

export function PopupHeader({
    trackedAccounts,
    selectedUserId,
    onSelectedUserChange,
    onOpenSettings,
}: PopupHeaderProps) {
    return (
        <div
            style={{
                padding: '16px 16px 12px',
                borderBottom: '1px solid #f0f0f0',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🕵️‍♂️</span>
                    <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
                        FriendDiff
                    </h1>
                </div>
                <button
                    onClick={onOpenSettings}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px',
                        color: '#9ca3af',
                        lineHeight: 1,
                        borderRadius: '6px',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none';
                    }}
                    title="Settings"
                    aria-label="Open settings"
                >
                    ⚙️
                </button>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#9ca3af', letterSpacing: '0.1px' }}>
                Find out who unfollowed you, instantly.
            </p>

            {trackedAccounts.length > 0 && (
                <select
                    value={selectedUserId}
                    onChange={(e) => onSelectedUserChange(e.target.value)}
                    style={{
                        appearance: 'none',
                        width: '100%',
                        padding: '7px 30px 7px 10px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background:
                            "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%236b7280\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>') no-repeat right 10px center",
                        backgroundColor: '#f9fafb',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    {trackedAccounts.map((account) => (
                        <option key={account.userId} value={account.userId}>
                            @{account.username}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}

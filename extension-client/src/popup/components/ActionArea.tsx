import React from 'react';
import { ScanMetrics } from '../types';

interface ActionAreaProps {
    isScanning: boolean;
    isOnProfile: boolean;
    scannedCount: number;
    scanMetrics: ScanMetrics;
    onStartScan: () => void;
    onGoToProfile: () => void;
}

const primaryButtonStyle: React.CSSProperties = {
    padding: '11px 16px',
    width: '100%',
    background: '#0095f6',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.15s',
    boxShadow: '0 1px 3px rgba(0,149,246,0.3)',
};

export function ActionArea({
    isScanning,
    isOnProfile,
    scannedCount,
    scanMetrics,
    onStartScan,
    onGoToProfile,
}: ActionAreaProps) {
    return (
        <div style={{ padding: '16px' }}>
            {!isScanning ? (
                <>
                    {isOnProfile ? (
                        <button
                            onClick={onStartScan}
                            style={primaryButtonStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0081d6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0095f6';
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            Start Scanning
                        </button>
                    ) : (
                        <button
                            onClick={onGoToProfile}
                            style={primaryButtonStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0081d6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#0095f6';
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Go to Profile
                        </button>
                    )}

                    <div
                        style={{
                            marginTop: '10px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#9ca3af',
                        }}
                    >
                        Status: <strong style={{ color: '#6b7280' }}>{isOnProfile ? 'Ready to scan' : 'Idle'}</strong>
                    </div>
                </>
            ) : (
                <div>
                    <div
                        style={{
                            width: '100%',
                            height: '8px',
                            background: '#f3f4f6',
                            borderRadius: '99px',
                            overflow: 'hidden',
                            marginBottom: '10px',
                        }}
                    >
                        <div
                            style={{
                                width: `${scanMetrics.percent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #0095f6, #00c6ff)',
                                borderRadius: '99px',
                                transition: 'width 0.6s ease',
                                backgroundSize: '40px 8px',
                                animation: 'progressStripe 0.8s linear infinite',
                            }}
                        />
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '6px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0095f6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ animation: 'spin 1s linear infinite' }}
                            >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                Scanning... ({scanMetrics.percent}%)
                            </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>{scannedCount} loaded</span>
                    </div>

                    <div
                        style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Estimated time: <strong style={{ color: '#374151' }}>{scanMetrics.eta || '~2m 15s'}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}

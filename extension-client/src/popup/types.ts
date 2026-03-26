export interface TrackedAccount {
    userId: string;
    username: string;
}

export interface HistoryItem {
    username: string;
    time: string;
}

export interface ScanMetrics {
    percent: number;
    eta: string;
}

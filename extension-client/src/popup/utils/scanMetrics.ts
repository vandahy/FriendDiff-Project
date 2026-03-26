import { ScanMetrics } from '../types';

function formatEta(totalSeconds: number): string {
    if (totalSeconds <= 0) return 'almost done!';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    if (m > 0) return `~${m}m ${s}s`;
    return `~${s}s`;
}

export function calculateScanMetrics(
    loadedFollowers: number,
    totalFollowers: number,
    scanStartTimeMs: number,
    recentSpeed: number
): ScanMetrics {
    if (totalFollowers <= 0) return { percent: 0, eta: 'Estimating...' };
    const percent = Math.min(Math.round((loadedFollowers / totalFollowers) * 100), 99);
    const elapsedSec = (Date.now() - scanStartTimeMs) / 1000;

    if (elapsedSec < 2 || loadedFollowers < 5) {
        const roughEta = (totalFollowers - loadedFollowers) / 1.5;
        return { percent, eta: formatEta(roughEta) };
    }

    const avgSpeed = loadedFollowers / elapsedSec;
    let effectiveSpeed = recentSpeed > 0 ? 0.3 * avgSpeed + 0.7 * recentSpeed : avgSpeed;

    effectiveSpeed = Math.max(effectiveSpeed, 0.05);

    const remaining = totalFollowers - loadedFollowers;
    const etaSec = remaining / effectiveSpeed;
    return { percent, eta: formatEta(etaSec) };
}

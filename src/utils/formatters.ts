export const formatValue = (val: number | null | undefined, decimals: number = 2, fallback: string = 'N/A'): string => {
  if (val === null || val === undefined || isNaN(val)) return fallback;
  return val.toFixed(decimals);
};

export const formatVoltage = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return 'N/A';
  return `${v.toFixed(1)} V`;
};

export const formatCurrent = (i: number | null | undefined): string => {
  if (i === null || i === undefined) return 'N/A';
  return `${i.toFixed(2)} A`;
};

export const formatTemperature = (t: number | null | undefined): string => {
  if (t === null || t === undefined) return 'N/A';
  return `${t.toFixed(1)} °C`;
};

export const formatVibration = (vib: number | null | undefined): string => {
  if (vib === null || vib === undefined) return 'N/A';
  return `${vib.toFixed(2)} mm/s`;
};

export const formatPower = (p: number | null | undefined): string => {
  if (p === null || p === undefined) return 'N/A';
  // If stored in Watts (>100), convert to kW; if already in kW (<=100), keep as is
  const kW = p > 100 ? p / 1000 : p;
  return `${kW.toFixed(2)} kW`;
};

export const formatEnergy = (e: number | null | undefined): string => {
  if (e === null || e === undefined) return 'N/A';
  return `${e.toFixed(1)} kWh`;
};

export const formatFrequency = (f: number | null | undefined): string => {
  if (f === null || f === undefined) return 'N/A';
  return `${f.toFixed(2)} Hz`;
};

export const formatPowerFactor = (pf: number | null | undefined): string => {
  if (pf === null || pf === undefined) return 'N/A';
  return `${pf.toFixed(2)} PF`;
};

export const formatDateTime = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return 'Invalid Date';
  }
};

export const formatTimeHHMMSS = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return 'N/A';
  }
};

export const formatTimeAgo = (isoString: string | null | undefined): string => {
  if (!isoString) return 'Never';
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  } catch {
    return 'Unknown';
  }
};

export type FreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'OFFLINE';

export const getDataFreshness = (isoString: string | null | undefined): { label: FreshnessStatus; colorClass: string } => {
  if (!isoString) {
    return { label: 'OFFLINE', colorClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
  try {
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec <= 120) {
      return { label: 'LIVE', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse' };
    }
    if (diffSec <= 300) {
      return { label: 'RECENT', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (diffSec <= 900) {
      return { label: 'STALE', colorClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'OFFLINE', colorClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  } catch {
    return { label: 'OFFLINE', colorClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
};

export const getSeverityColorClass = (severity: string | null | undefined) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-red-600 text-white border-red-700';
    case 'fault':
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warning':
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'healthy':
    case 'low':
    case 'optimal':
    case 'good':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const mapDecisionText = (decision: string | null | undefined): { title: string; color: string } => {
  if (!decision) return { title: 'No Maintenance Required', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  const lower = decision.toLowerCase();
  if (lower.includes('normal') || lower.includes('no maintenance')) {
    return { title: 'No Maintenance Required', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }
  if (lower.includes('inspection')) {
    return { title: 'Inspection Recommended', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (lower.includes('required') || lower.includes('maintenance_required')) {
    return { title: 'Maintenance Required', color: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (lower.includes('immediate') || lower.includes('attention')) {
    return { title: 'Immediate Attention Required', color: 'bg-red-600 text-white border-red-700' };
  }
  return { title: decision, color: 'bg-slate-100 text-slate-800 border-slate-200' };
};

export const formatConfidence = (confidence: number | null | undefined): string => {
  if (confidence === null || confidence === undefined || isNaN(confidence)) return '99%';
  const percentage = Math.round(confidence <= 1 ? confidence * 100 : confidence);
  return `${percentage}%`;
};


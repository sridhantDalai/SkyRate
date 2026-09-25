// ─── Currency ────────────────────────────────────────────────────────────────

const INR_FULL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_DECIMAL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats INR currency. Returns '—' for null/undefined/NaN. */
export function formatINR(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—';
  if (decimals > 0) return INR_DECIMAL.format(value);
  return INR_FULL.format(value);
}

/** Alias kept for backward compatibility. */
export function formatCurrency(
  value: number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  if (value == null || isNaN(value)) return '—';
  const fmt = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  });
  return fmt.format(value);
}

/**
 * Compact INR for axis labels / large spaces.
 * ₹1,23,456 → ₹1.2L  |  ₹12,34,567 → ₹12.3L  |  ₹1,23,45,678 → ₹1.2Cr
 */
export function formatINRCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(1)}Cr`;
  }
  if (Math.abs(value) >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(1)}L`;
  }
  if (Math.abs(value) >= 1_000) {
    return `₹${(value / 1_000).toFixed(0)}K`;
  }
  return `₹${value.toFixed(0)}`;
}

// ─── Index values ─────────────────────────────────────────────────────────────

/**
 * Formats an APIx index value as "NNN.NN pt" with 2 decimal places.
 * Index values are dimensionless points, not currency.
 */
export function formatIndex(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return value.toFixed(decimals);
}

/** Index delta label: "+2.34 pt" / "-1.22 pt" */
export function formatIndexDelta(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} pt`;
}

// ─── Percentages ─────────────────────────────────────────────────────────────

/**
 * Formats a percentage value.
 * @param includeSign Prepends "+" for positive values when true (default true).
 * @param decimals    Decimal places (default 2).
 */
export function formatPercentage(
  value: number | null | undefined,
  includeSign = true,
  decimals = 2
): string {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value).toFixed(decimals);
  if (includeSign && value > 0) return `+${abs}%`;
  if (value < 0) return `-${abs}%`;
  return `${abs}%`;
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Compact number: 1,234,567 → 1.2M  |  12,345 → 12.3K
 */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

// ─── Dates & Times ────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string or YYYY-MM-DD to a human-readable date.
 * Uses local-safe parsing to avoid UTC-vs-IST timezone skew.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    // Prefer local parsing: split 'YYYY-MM-DD' to avoid UTC-offset issues
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Formats an ISO datetime to time string (HH:MM:SS).
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

/**
 * Short date for chart X-axis ticks: "12 Sep" or "Sep '24".
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.slice(5) ?? '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return dateString;
  }
}

/** Formats "YYYY-MM-DD" to "MMM YYYY" month label. */
export function formatMonthLabel(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length >= 2) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    return dateString.slice(0, 7);
  } catch {
    return dateString;
  }
}

/** Returns the "last updated X minutes ago" text from an ISO timestamp. */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    if (isNaN(diff)) return '—';
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  } catch {
    return '—';
  }
}

// ─── Horizon labels ───────────────────────────────────────────────────────────

/**
 * Formats lead-time / departure horizon window into user-friendly plain English.
 * Examples:
 *   'T'    -> 'Today'
 *   'T+1'  -> '1 Day Later'
 *   'T+7'  -> '1 Week Later'
 *   'T+15' -> '15 Days Later'
 *   'T+30' -> '1 Month Later'
 *   'T+45' -> '45 Days Later'
 *   'T+60' -> '2 Months Later'
 *   'T+90' -> '3 Months Later'
 */
export function formatHorizon(horizon: string | null | undefined, includeCode = false): string {
  if (!horizon) return '—';
  const clean = horizon.trim().toUpperCase();
  let label = clean;

  switch (clean) {
    case 'T':
    case 'T+0':
    case 'T-0':
      label = 'Today';
      break;
    case 'T+1':
      label = '1 Day Later';
      break;
    case 'T+7':
      label = '1 Week Later';
      break;
    case 'T+15':
      label = '15 Days Later';
      break;
    case 'T+30':
      label = '1 Month Later';
      break;
    case 'T+45':
      label = '45 Days Later';
      break;
    case 'T+60':
      label = '2 Months Later';
      break;
    case 'T+90':
      label = '3 Months Later';
      break;
    default:
      if (clean.startsWith('T+')) {
        const days = clean.slice(2);
        label = `${days} Days Later`;
      }
      break;
  }

  if (includeCode && clean.startsWith('T')) {
    return `${label} (${clean})`;
  }
  return label;
}

export function formatHorizonLabel(horizon: string | null | undefined): string {
  switch (horizon?.toUpperCase()) {
    case 'T':   return 'Today (T)';
    case 'T+1': return '1 Day Later (T+1)';
    case 'T+7': return '1 Week Later (T+7)';
    case 'T+15': return '15 Days Later (T+15)';
    case 'T+30': return '1 Month Later (T+30)';
    case 'T+45': return '45 Days Later (T+45)';
    default: return horizon ?? '—';
  }
}


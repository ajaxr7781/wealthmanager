import { formatDistanceToNow, parseISO, format } from 'date-fns';

/**
 * Format a date string to show relative time and absolute time
 * @param dateString - ISO date string
 * @returns Formatted string like "5m ago · Jan 3, 2:30 PM"
 */
export function formatRelativeWithTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  
  try {
    const date = parseISO(dateString);
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = format(date, 'MMM d, h:mm a');
    return `${relative} · ${absolute}`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date string to show just relative time
 * @param dateString - ISO date string
 * @returns Formatted string like "5 minutes ago"
 */
export function formatRelative(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date string to show date and time
 * @param dateString - ISO date string
 * @returns Formatted string like "Jan 3, 2025 2:30 PM"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date string to show just date
 * @param dateString - ISO date string
 * @returns Formatted string like "Jan 3, 2025"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date string to show short relative time
 * @param dateString - ISO date string
 * @returns Formatted string like "5m" or "2h" or "3d"
 */
export function formatShortRelative(dateString: string | null | undefined): string {
  if (!dateString) return '--';
  
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 30) return `${diffDays}d`;
    
    return format(date, 'MMM d');
  } catch {
    return '--';
  }
}

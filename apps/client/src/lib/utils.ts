/** Merge class names safely (replaces clsx dependency) */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Get user initials from first and last name */
export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

/** Format a date string to a readable format */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Truncate a string to a max length */
export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

/** Status display config */
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: 'To Do', color: 'text-slate-300', bg: 'bg-slate-500/20' },
  in_progress: { label: 'In Progress', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  in_review: { label: 'In Review', color: 'text-amber-300', bg: 'bg-amber-500/20' },
  done: { label: 'Done', color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  blocked: { label: 'Blocked', color: 'text-red-300', bg: 'bg-red-500/20' },
  active: { label: 'Active', color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  completed: { label: 'Completed', color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-slate-300', bg: 'bg-slate-500/20' },
  medium: { label: 'Medium', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  high: { label: 'High', color: 'text-orange-300', bg: 'bg-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-300', bg: 'bg-red-500/20' },
};

export const KANBAN_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'border-slate-500' },
  { key: 'in_progress', label: 'In Progress', color: 'border-blue-500' },
  { key: 'in_review', label: 'In Review', color: 'border-amber-500' },
  { key: 'done', label: 'Done', color: 'border-emerald-500' },
];

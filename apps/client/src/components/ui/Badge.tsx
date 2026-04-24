import { cn } from '../../lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/utils';

interface BadgeProps {
  variant?: 'status' | 'priority';
  value: string;
  className?: string;
}

export function Badge({ variant = 'status', value, className }: BadgeProps) {
  const config = variant === 'priority' ? PRIORITY_CONFIG[value] : STATUS_CONFIG[value];
  if (!config) return <span className="text-xs text-gray-400">{value}</span>;

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.color, className)}>
      {config.label}
    </span>
  );
}

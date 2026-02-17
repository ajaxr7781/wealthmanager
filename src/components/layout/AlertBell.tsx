import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useOpenAlertsCount } from '@/hooks/useAlerts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AlertBell({ className }: { className?: string }) {
  const count = useOpenAlertsCount();

  return (
    <Link to="/alerts">
      <Button
        variant="ghost"
        size="icon"
        className={cn('relative', className)}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>
    </Link>
  );
}

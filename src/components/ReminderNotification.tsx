import { useEffect, useState } from 'react';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ReminderNotification() {
  const { todayReminders, markComplete } = useReminders();
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show toast for new reminders
    todayReminders.forEach(reminder => {
      if (!shownReminders.has(reminder.id)) {
        toast(
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{reminder.title}</p>
              {reminder.description && (
                <p className="text-sm text-muted-foreground truncate">{reminder.description}</p>
              )}
            </div>
          </div>,
          {
            duration: 10000,
            action: {
              label: 'Completar',
              onClick: () => markComplete.mutate(reminder.id),
            },
          }
        );
        setShownReminders(prev => new Set(prev).add(reminder.id));
      }
    });
  }, [todayReminders, shownReminders, markComplete]);

  return null;
}

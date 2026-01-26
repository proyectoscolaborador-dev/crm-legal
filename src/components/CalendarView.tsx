import { useMemo, useState } from 'react';
import { WorkWithClient } from '@/types/database';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { 
  format, 
  parseISO, 
  isSameDay, 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, Mail, Check, Trash2, Bell, Briefcase } from 'lucide-react';

interface CalendarViewProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

export function CalendarView({ works, onWorkClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { reminders, markComplete, deleteReminder } = useReminders();

  const worksWithDates = useMemo(() => {
    return works.filter(w => w.due_date);
  }, [works]);

  const selectedDateWorks = useMemo(() => {
    if (!selectedDate) return [];
    return worksWithDates.filter(w => 
      w.due_date && isSameDay(parseISO(w.due_date), selectedDate)
    );
  }, [selectedDate, worksWithDates]);

  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    return reminders.filter(r => 
      isSameDay(parseISO(r.reminder_date), selectedDate)
    );
  }, [selectedDate, reminders]);

  // Dates with works or reminders
  const datesWithWorks = useMemo(() => {
    return worksWithDates.map(w => parseISO(w.due_date!));
  }, [worksWithDates]);

  const datesWithReminders = useMemo(() => {
    return reminders.filter(r => !r.is_completed).map(r => parseISO(r.reminder_date));
  }, [reminders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getReminderTypeEmoji = (type: string) => {
    switch (type) {
      case 'enviar_presupuesto': return '📤';
      case 'solicitar_cobro': return '💰';
      case 'visita': return '🏠';
      case 'llamada': return '📞';
      default: return '📌';
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="glass-card p-4 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={es}
          className="rounded-md"
          modifiers={{
            hasWork: datesWithWorks,
            hasReminder: datesWithReminders,
          }}
          modifiersStyles={{
            hasWork: {
              backgroundColor: 'hsl(var(--primary) / 0.2)',
              color: 'hsl(var(--primary))',
              fontWeight: 'bold',
            },
            hasReminder: {
              border: '2px solid hsl(var(--warning))',
              borderRadius: '50%',
            },
          }}
        />
      </div>

      <div className="glass-card p-4 space-y-4">
        <h3 className="font-semibold text-foreground">
          {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona una fecha'}
        </h3>

        {/* Reminders Section */}
        {selectedDateReminders.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Recordatorios
            </h4>
            <div className="space-y-2">
              {selectedDateReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-3 rounded-lg border transition-all ${
                    reminder.is_completed 
                      ? 'bg-muted/30 border-border opacity-60' 
                      : 'bg-warning/10 border-warning/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${reminder.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {getReminderTypeEmoji(reminder.reminder_type)} {reminder.title}
                      </p>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground truncate">{reminder.description}</p>
                      )}
                      {reminder.reminder_time && (
                        <p className="text-xs text-muted-foreground mt-1">⏰ {reminder.reminder_time}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!reminder.is_completed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-success hover:bg-success/10 transition-transform active:scale-90"
                          onClick={() => markComplete.mutate(reminder.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 transition-transform active:scale-90"
                        onClick={() => deleteReminder.mutate(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Works Section */}
        {selectedDateWorks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Trabajos
            </h4>
            <div className="space-y-2">
              {selectedDateWorks.map((work) => (
                <button
                  key={work.id}
                  onClick={() => onWorkClick(work)}
                  className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all active:scale-[0.98]"
                >
                  <p className="font-medium text-foreground">{work.title}</p>
                  <p className="text-sm text-muted-foreground">{work.client?.name}</p>
                  
                  {/* Client contact info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {work.client?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {work.client.phone}
                      </span>
                    )}
                    {work.client?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {work.client.email}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium text-primary">
                      {formatCurrency(Number(work.amount))}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      work.is_paid 
                        ? 'bg-secondary/20 text-secondary' 
                        : 'bg-warning/20 text-warning'
                    }`}>
                      {work.is_paid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDateWorks.length === 0 && selectedDateReminders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay trabajos ni recordatorios para esta fecha
          </p>
        )}
      </div>
    </div>
  );
}

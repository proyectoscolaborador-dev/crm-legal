import { useMemo, useState } from 'react';
import { WorkWithClient } from '@/types/database';
import { Calendar } from '@/components/ui/calendar';
import { 
  format, 
  parseISO, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval 
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarViewProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

export function CalendarView({ works, onWorkClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const worksWithDates = useMemo(() => {
    return works.filter(w => w.due_date);
  }, [works]);

  const selectedDateWorks = useMemo(() => {
    if (!selectedDate) return [];
    return worksWithDates.filter(w => 
      w.due_date && isSameDay(parseISO(w.due_date), selectedDate)
    );
  }, [selectedDate, worksWithDates]);

  const datesWithWorks = useMemo(() => {
    return worksWithDates.map(w => parseISO(w.due_date!));
  }, [worksWithDates]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
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
          }}
          modifiersStyles={{
            hasWork: {
              backgroundColor: 'hsl(var(--primary) / 0.2)',
              color: 'hsl(var(--primary))',
              fontWeight: 'bold',
            },
          }}
        />
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-foreground mb-4">
          {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona una fecha'}
        </h3>

        {selectedDateWorks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay trabajos programados para esta fecha
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDateWorks.map((work) => (
              <button
                key={work.id}
                onClick={() => onWorkClick(work)}
                className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <p className="font-medium text-foreground">{work.title}</p>
                <p className="text-sm text-muted-foreground">{work.client?.name}</p>
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
        )}
      </div>
    </div>
  );
}

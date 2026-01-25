import { useMemo } from 'react';
import { WorkWithClient } from '@/types/database';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { differenceInHours, differenceInDays, isToday, isPast, parseISO } from 'date-fns';

interface AlertsSectionProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

interface Alert {
  type: 'budget_no_response' | 'invoice_overdue' | 'invoice_due_today';
  work: WorkWithClient;
  message: string;
}

export function AlertsSection({ works, onWorkClick }: AlertsSectionProps) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const now = new Date();

    works.forEach(work => {
      // Presupuestos sin respuesta (+48h)
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const sentAt = parseISO(work.budget_sent_at);
        const hoursSinceSent = differenceInHours(now, sentAt);
        
        if (hoursSinceSent >= 48) {
          result.push({
            type: 'budget_no_response',
            work,
            message: `Sin respuesta desde hace ${Math.floor(hoursSinceSent / 24)} días`,
          });
        }
      }

      // Facturas vencidas o que vencen hoy
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        const dueDate = parseISO(work.due_date);
        
        if (isToday(dueDate)) {
          result.push({
            type: 'invoice_due_today',
            work,
            message: 'Vence hoy',
          });
        } else if (isPast(dueDate)) {
          const daysOverdue = differenceInDays(now, dueDate);
          result.push({
            type: 'invoice_overdue',
            work,
            message: `Vencida hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`,
          });
        }
      }
    });

    return result;
  }, [works]);

  if (alerts.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Alertas ({alerts.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert, index) => (
          <button
            key={`${alert.work.id}-${index}`}
            onClick={() => onWorkClick(alert.work)}
            className={`alert-badge cursor-pointer transition-transform hover:scale-105 ${
              alert.type === 'invoice_overdue' ? 'alert-danger' :
              alert.type === 'invoice_due_today' ? 'alert-warning' :
              'alert-warning'
            }`}
          >
            {alert.type === 'invoice_overdue' ? (
              <XCircle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span className="font-medium">{alert.work.client?.name || 'Cliente'}</span>
            <span className="opacity-75">· {alert.message}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

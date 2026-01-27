import { useMemo } from 'react';
import { WorkWithClient } from '@/types/database';
import { Presupuesto } from '@/types/empresa';
import { Reminder } from '@/hooks/useReminders';
import { AlertTriangle, Clock, XCircle, FileText, Calendar, Users, TrendingDown, Bell } from 'lucide-react';
import { differenceInHours, differenceInDays, isToday, isTomorrow, isPast, parseISO, addDays, isBefore } from 'date-fns';

interface AlertsSectionProps {
  works: WorkWithClient[];
  presupuestos?: Presupuesto[];
  reminders?: Reminder[];
  onWorkClick: (work: WorkWithClient) => void;
}

type AlertPriority = 'critico' | 'importante' | 'informativo';

interface Alert {
  type: string;
  priority: AlertPriority;
  work?: WorkWithClient;
  message: string;
  icon: 'danger' | 'warning' | 'info';
  clientName?: string;
}

export function AlertsSection({ works, presupuestos = [], reminders = [], onWorkClick }: AlertsSectionProps) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const now = new Date();

    // Helper to format currency
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);

    // 1. CRÍTICO: Facturas vencidas
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        const dueDate = parseISO(work.due_date);
        
        if (isPast(dueDate) && !isToday(dueDate)) {
          const daysOverdue = differenceInDays(now, dueDate);
          result.push({
            type: 'invoice_overdue',
            priority: 'critico',
            work,
            message: `Vencida hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`,
            icon: 'danger',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 2. CRÍTICO: Clientes con deuda alta (>5000€ o ≥2 facturas vencidas)
    const deudaPorCliente: Record<string, { 
      nombre: string; 
      deuda: number; 
      vencidas: number;
      works: WorkWithClient[];
    }> = {};

    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid) {
        const clientId = work.client_id;
        const clientName = work.client?.name || 'Cliente';
        const deuda = Number(work.amount) - Number(work.advance_payments || 0);
        const vencida = work.due_date && isPast(parseISO(work.due_date));

        if (!deudaPorCliente[clientId]) {
          deudaPorCliente[clientId] = { nombre: clientName, deuda: 0, vencidas: 0, works: [] };
        }

        deudaPorCliente[clientId].deuda += deuda;
        deudaPorCliente[clientId].works.push(work);
        if (vencida) deudaPorCliente[clientId].vencidas++;
      }
    });

    Object.values(deudaPorCliente).forEach(cliente => {
      if (cliente.deuda > 5000 || cliente.vencidas >= 2) {
        result.push({
          type: 'high_debt_client',
          priority: 'critico',
          work: cliente.works[0],
          message: `Deuda: ${formatCurrency(cliente.deuda)} (${cliente.vencidas} vencidas)`,
          icon: 'danger',
          clientName: cliente.nombre,
        });
      }
    });

    // 3. CRÍTICO: Agenda vencida o de hoy
    reminders.forEach(reminder => {
      if (reminder.is_completed) return;
      const reminderDate = parseISO(reminder.reminder_date);

      if (isPast(reminderDate) && !isToday(reminderDate)) {
        result.push({
          type: 'reminder_overdue',
          priority: 'critico',
          message: `Vencido: ${reminder.title}`,
          icon: 'danger',
        });
      } else if (isToday(reminderDate)) {
        result.push({
          type: 'reminder_today',
          priority: 'critico',
          message: `Hoy: ${reminder.title}`,
          icon: 'danger',
        });
      }
    });

    // 4. IMPORTANTE: Facturas que vencen hoy
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        const dueDate = parseISO(work.due_date);
        
        if (isToday(dueDate)) {
          result.push({
            type: 'invoice_due_today',
            priority: 'importante',
            work,
            message: 'Vence hoy',
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 5. IMPORTANTE: Presupuestos sin respuesta (+7 días)
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const sentAt = parseISO(work.budget_sent_at);
        const daysSinceSent = differenceInDays(now, sentAt);
        
        if (daysSinceSent >= 7) {
          result.push({
            type: 'budget_no_response',
            priority: 'importante',
            work,
            message: `Sin respuesta ${daysSinceSent} días`,
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 6. IMPORTANTE: Agenda mañana
    reminders.forEach(reminder => {
      if (reminder.is_completed) return;
      const reminderDate = parseISO(reminder.reminder_date);

      if (isTomorrow(reminderDate)) {
        result.push({
          type: 'reminder_tomorrow',
          priority: 'importante',
          message: `Mañana: ${reminder.title}`,
          icon: 'warning',
        });
      }
    });

    // 7. IMPORTANTE: Presupuestos sin respuesta (+48h pero <7 días) - menos prioridad
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const sentAt = parseISO(work.budget_sent_at);
        const hoursSinceSent = differenceInHours(now, sentAt);
        const daysSinceSent = differenceInDays(now, sentAt);
        
        if (hoursSinceSent >= 48 && daysSinceSent < 7) {
          result.push({
            type: 'budget_pending_48h',
            priority: 'importante',
            work,
            message: `Esperando ${Math.floor(hoursSinceSent / 24)} días`,
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 8. INFORMATIVO: Presupuestos pendientes de envío (borrador)
    const presupuestosBorrador = presupuestos.filter(p => p.estado_presupuesto === 'borrador');
    if (presupuestosBorrador.length > 0) {
      result.push({
        type: 'budgets_draft',
        priority: 'informativo',
        message: `${presupuestosBorrador.length} presupuesto${presupuestosBorrador.length > 1 ? 's' : ''} sin enviar`,
        icon: 'info',
      });
    }

    // 9. INFORMATIVO: Facturas pendientes de cobro (resumen)
    const facturasPendientes = works.filter(w => 
      w.status === 'factura_enviada' && !w.is_paid && w.due_date && !isPast(parseISO(w.due_date))
    );
    if (facturasPendientes.length > 0) {
      const total = facturasPendientes.reduce((sum, w) => 
        sum + Number(w.amount) - Number(w.advance_payments || 0), 0
      );
      result.push({
        type: 'invoices_pending',
        priority: 'informativo',
        message: `${facturasPendientes.length} factura${facturasPendientes.length > 1 ? 's' : ''} pendientes: ${formatCurrency(total)}`,
        icon: 'info',
      });
    }

    // 10. INFORMATIVO: Agenda próximos 7 días (resumen)
    const proximosReminders = reminders.filter(r => {
      if (r.is_completed) return false;
      const reminderDate = parseISO(r.reminder_date);
      const in7Days = addDays(now, 7);
      return !isToday(reminderDate) && !isTomorrow(reminderDate) && 
             !isPast(reminderDate) && isBefore(reminderDate, in7Days);
    });
    if (proximosReminders.length > 0) {
      result.push({
        type: 'reminders_upcoming',
        priority: 'informativo',
        message: `${proximosReminders.length} evento${proximosReminders.length > 1 ? 's' : ''} próximos 7 días`,
        icon: 'info',
      });
    }

    // 11. INFORMATIVO: Riesgo operativo - muchos trabajos sin facturar
    const pendientesFacturar = works.filter(w => w.status === 'pendiente_facturar');
    if (pendientesFacturar.length >= 3) {
      const total = pendientesFacturar.reduce((sum, w) => sum + Number(w.amount), 0);
      result.push({
        type: 'risk_operational',
        priority: 'informativo',
        message: `${pendientesFacturar.length} trabajos sin facturar: ${formatCurrency(total)}`,
        icon: 'info',
      });
    }

    // 12. INFORMATIVO: Riesgo comercial - muchos presupuestos sin respuesta
    const sinRespuestaTotal = works.filter(w => 
      w.status === 'presupuesto_enviado' && w.budget_sent_at && 
      differenceInDays(now, parseISO(w.budget_sent_at)) >= 3
    );
    if (sinRespuestaTotal.length >= 5) {
      const total = sinRespuestaTotal.reduce((sum, w) => sum + Number(w.amount), 0);
      result.push({
        type: 'risk_commercial',
        priority: 'informativo',
        message: `${sinRespuestaTotal.length} presupuestos esperando: ${formatCurrency(total)}`,
        icon: 'info',
      });
    }

    // Sort by priority: critico -> importante -> informativo
    const prioridadOrden = { critico: 0, importante: 1, informativo: 2 };
    return result.sort((a, b) => prioridadOrden[a.priority] - prioridadOrden[b.priority]);
  }, [works, presupuestos, reminders]);

  if (alerts.length === 0) return null;

  const getAlertClass = (icon: string) => {
    switch (icon) {
      case 'danger': return 'alert-danger';
      case 'warning': return 'alert-warning';
      default: return 'bg-muted/50 text-muted-foreground border border-border';
    }
  };

  const getIcon = (type: string, icon: string) => {
    if (type.startsWith('reminder') || type === 'reminders_upcoming') {
      return <Calendar className="w-3 h-3" />;
    }
    if (type === 'high_debt_client') {
      return <Users className="w-3 h-3" />;
    }
    if (type.startsWith('budget') || type === 'budgets_draft' || type === 'risk_commercial') {
      return <FileText className="w-3 h-3" />;
    }
    if (type.startsWith('risk')) {
      return <TrendingDown className="w-3 h-3" />;
    }
    if (icon === 'danger') {
      return <XCircle className="w-3 h-3" />;
    }
    if (icon === 'warning') {
      return <Clock className="w-3 h-3" />;
    }
    return <Bell className="w-3 h-3" />;
  };

  // Count by priority
  const criticalCount = alerts.filter(a => a.priority === 'critico').length;
  const importantCount = alerts.filter(a => a.priority === 'importante').length;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Alertas ({alerts.length})
        {criticalCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
            {criticalCount} críticas
          </span>
        )}
        {importantCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">
            {importantCount} importantes
          </span>
        )}
      </h3>
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert, index) => (
          <button
            key={`${alert.type}-${index}`}
            onClick={() => alert.work && onWorkClick(alert.work)}
            disabled={!alert.work}
            className={`alert-badge transition-transform hover:scale-105 ${getAlertClass(alert.icon)} ${
              alert.work ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {getIcon(alert.type, alert.icon)}
            {alert.clientName && (
              <span className="font-medium">{alert.clientName}</span>
            )}
            <span className={alert.clientName ? 'opacity-75' : 'font-medium'}>
              {alert.clientName ? `· ${alert.message}` : alert.message}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

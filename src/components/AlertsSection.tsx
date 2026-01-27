import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkWithClient } from '@/types/database';
import { Presupuesto } from '@/types/empresa';
import { Reminder } from '@/hooks/useReminders';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { differenceInHours, differenceInDays, isToday, isTomorrow, isPast, parseISO, addDays, isBefore } from 'date-fns';

interface AlertsSectionProps {
  works: WorkWithClient[];
  presupuestos?: Presupuesto[];
  reminders?: Reminder[];
  onWorkClick: (work: WorkWithClient) => void;
}

type AlertPriority = 'critico' | 'importante' | 'informativo';

export function AlertsSection({ works, presupuestos = [], reminders = [] }: AlertsSectionProps) {
  const navigate = useNavigate();

  const alertCounts = useMemo(() => {
    let critico = 0;
    let importante = 0;
    let informativo = 0;
    const now = new Date();

    // 1. CRÍTICO: Facturas vencidas
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        const dueDate = parseISO(work.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          critico++;
        }
      }
    });

    // 2. CRÍTICO: Clientes con deuda alta
    const deudaPorCliente: Record<string, { deuda: number; vencidas: number }> = {};
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid) {
        const clientId = work.client_id;
        const deuda = Number(work.amount) - Number(work.advance_payments || 0);
        const vencida = work.due_date && isPast(parseISO(work.due_date));

        if (!deudaPorCliente[clientId]) {
          deudaPorCliente[clientId] = { deuda: 0, vencidas: 0 };
        }
        deudaPorCliente[clientId].deuda += deuda;
        if (vencida) deudaPorCliente[clientId].vencidas++;
      }
    });
    Object.values(deudaPorCliente).forEach(cliente => {
      if (cliente.deuda > 5000 || cliente.vencidas >= 2) critico++;
    });

    // 3. CRÍTICO: Agenda vencida o de hoy
    reminders.forEach(reminder => {
      if (reminder.is_completed) return;
      const reminderDate = parseISO(reminder.reminder_date);
      if (isPast(reminderDate) && !isToday(reminderDate)) critico++;
      else if (isToday(reminderDate)) critico++;
    });

    // 4. IMPORTANTE: Facturas que vencen hoy
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        if (isToday(parseISO(work.due_date))) importante++;
      }
    });

    // 5. IMPORTANTE: Presupuestos sin respuesta (+7 días)
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const daysSinceSent = differenceInDays(now, parseISO(work.budget_sent_at));
        if (daysSinceSent >= 7) importante++;
      }
    });

    // 6. IMPORTANTE: Agenda mañana
    reminders.forEach(reminder => {
      if (reminder.is_completed) return;
      if (isTomorrow(parseISO(reminder.reminder_date))) importante++;
    });

    // 7. IMPORTANTE: Presupuestos sin respuesta (+48h pero <7 días)
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const hoursSinceSent = differenceInHours(now, parseISO(work.budget_sent_at));
        const daysSinceSent = differenceInDays(now, parseISO(work.budget_sent_at));
        if (hoursSinceSent >= 48 && daysSinceSent < 7) importante++;
      }
    });

    // 8. INFORMATIVO: Presupuestos pendientes de envío
    const presupuestosBorrador = presupuestos.filter(p => p.estado_presupuesto === 'borrador');
    informativo += presupuestosBorrador.length;

    // 9. INFORMATIVO: Facturas pendientes de cobro
    const facturasPendientes = works.filter(w =>
      w.status === 'factura_enviada' && !w.is_paid && w.due_date &&
      !isPast(parseISO(w.due_date)) && !isToday(parseISO(w.due_date))
    );
    informativo += facturasPendientes.length;

    // 10. INFORMATIVO: Agenda próximos 7 días
    const proximosReminders = reminders.filter(r => {
      if (r.is_completed) return false;
      const reminderDate = parseISO(r.reminder_date);
      const in7Days = addDays(now, 7);
      return !isToday(reminderDate) && !isTomorrow(reminderDate) &&
        !isPast(reminderDate) && isBefore(reminderDate, in7Days);
    });
    informativo += proximosReminders.length;

    // 11. INFORMATIVO: Riesgo operativo
    const pendientesFacturar = works.filter(w => w.status === 'pendiente_facturar');
    if (pendientesFacturar.length >= 3) informativo++;

    // 12. INFORMATIVO: Riesgo comercial
    const sinRespuestaTotal = works.filter(w =>
      w.status === 'presupuesto_enviado' && w.budget_sent_at &&
      differenceInDays(now, parseISO(w.budget_sent_at)) >= 3
    );
    if (sinRespuestaTotal.length >= 5) informativo++;

    return { critico, importante, informativo, total: critico + importante + informativo };
  }, [works, presupuestos, reminders]);

  if (alertCounts.total === 0) return null;

  return (
    <button
      onClick={() => navigate('/alertas')}
      className="w-full glass-card p-4 flex items-center justify-between transition-all hover:bg-muted/50 group"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <span className="font-semibold text-foreground">Alertas</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-sm font-medium">
          {alertCounts.total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {alertCounts.critico > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
            {alertCounts.critico} críticas
          </span>
        )}
        {alertCounts.importante > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
            {alertCounts.importante} importantes
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
}

import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorks } from '@/hooks/useWorks';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useReminders } from '@/hooks/useReminders';
import { WorkWithClient } from '@/types/database';
import { ArrowLeft, AlertTriangle, XCircle, Clock, Bell, FileText, Calendar, Users, TrendingDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInHours, differenceInDays, isToday, isTomorrow, isPast, parseISO, addDays, isBefore, format } from 'date-fns';
import { es } from 'date-fns/locale';

type AlertPriority = 'critico' | 'importante' | 'informativo';
type AlertCategory = 'financial' | 'commercial' | 'operational' | 'agenda';

interface Alert {
  type: string;
  priority: AlertPriority;
  category: AlertCategory;
  work?: WorkWithClient;
  message: string;
  details?: string;
  icon: 'danger' | 'warning' | 'info';
  clientName?: string;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { works, isLoading: worksLoading } = useWorks();
  const { presupuestos } = usePresupuestos();
  const { reminders } = useReminders();

  const financialRef = useRef<HTMLDivElement>(null);
  const commercialRef = useRef<HTMLDivElement>(null);
  const agendaRef = useRef<HTMLDivElement>(null);
  const operationalRef = useRef<HTMLDivElement>(null);

  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const now = new Date();

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);

    // 1. CRÍTICO: Facturas vencidas
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        const dueDate = parseISO(work.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          const daysOverdue = differenceInDays(now, dueDate);
          const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);
          result.push({
            type: 'invoice_overdue',
            priority: 'critico',
            category: 'financial',
            work,
            message: `Factura vencida hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`,
            details: `Importe: ${formatCurrency(pendingAmount)} · Vencimiento: ${format(dueDate, 'dd MMM yyyy', { locale: es })}`,
            icon: 'danger',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 2. CRÍTICO: Clientes con deuda alta
    const deudaPorCliente: Record<string, { nombre: string; deuda: number; vencidas: number; works: WorkWithClient[] }> = {};
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
          category: 'financial',
          work: cliente.works[0],
          message: `Cliente con deuda alta`,
          details: `Deuda: ${formatCurrency(cliente.deuda)} · ${cliente.vencidas} vencida${cliente.vencidas !== 1 ? 's' : ''}`,
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
        const daysOverdue = differenceInDays(now, reminderDate);
        result.push({
          type: 'reminder_overdue',
          priority: 'critico',
          category: 'agenda',
          message: `Evento vencido: ${reminder.title}`,
          details: `Hace ${daysOverdue} día${daysOverdue > 1 ? 's' : ''} · ${format(reminderDate, 'dd MMM yyyy', { locale: es })}`,
          icon: 'danger',
        });
      } else if (isToday(reminderDate)) {
        result.push({
          type: 'reminder_today',
          priority: 'critico',
          category: 'agenda',
          message: `Hoy: ${reminder.title}`,
          details: reminder.description || 'Programado para hoy',
          icon: 'danger',
        });
      }
    });

    // 4. IMPORTANTE: Facturas que vencen hoy
    works.forEach(work => {
      if (work.status === 'factura_enviada' && !work.is_paid && work.due_date) {
        if (isToday(parseISO(work.due_date))) {
          const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);
          result.push({
            type: 'invoice_due_today',
            priority: 'importante',
            category: 'financial',
            work,
            message: 'Factura vence hoy',
            details: `Importe: ${formatCurrency(pendingAmount)}`,
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 5. IMPORTANTE: Presupuestos sin respuesta (+7 días)
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const daysSinceSent = differenceInDays(now, parseISO(work.budget_sent_at));
        if (daysSinceSent >= 7) {
          result.push({
            type: 'budget_no_response',
            priority: 'importante',
            category: 'commercial',
            work,
            message: `Presupuesto sin respuesta`,
            details: `Hace ${daysSinceSent} días · ${formatCurrency(Number(work.amount))}`,
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 6. IMPORTANTE: Agenda mañana
    reminders.forEach(reminder => {
      if (reminder.is_completed) return;
      if (isTomorrow(parseISO(reminder.reminder_date))) {
        result.push({
          type: 'reminder_tomorrow',
          priority: 'importante',
          category: 'agenda',
          message: `Mañana: ${reminder.title}`,
          details: reminder.description || 'Programado para mañana',
          icon: 'warning',
        });
      }
    });

    // 7. IMPORTANTE: Presupuestos sin respuesta (+48h pero <7 días)
    works.forEach(work => {
      if (work.status === 'presupuesto_enviado' && work.budget_sent_at) {
        const hoursSinceSent = differenceInHours(now, parseISO(work.budget_sent_at));
        const daysSinceSent = differenceInDays(now, parseISO(work.budget_sent_at));
        if (hoursSinceSent >= 48 && daysSinceSent < 7) {
          result.push({
            type: 'budget_pending_48h',
            priority: 'importante',
            category: 'commercial',
            work,
            message: `Presupuesto esperando`,
            details: `Hace ${Math.floor(hoursSinceSent / 24)} días · ${formatCurrency(Number(work.amount))}`,
            icon: 'warning',
            clientName: work.client?.name,
          });
        }
      }
    });

    // 8. INFORMATIVO: Presupuestos sin enviar
    presupuestos.filter(p => p.estado_presupuesto === 'borrador').forEach(p => {
      const linkedWork = works.find(w => w.id === p.work_id);
      result.push({
        type: 'budgets_draft',
        priority: 'informativo',
        category: 'commercial',
        work: linkedWork,
        message: `Presupuesto sin enviar`,
        details: `${p.obra_titulo} · ${formatCurrency(p.total_presupuesto)}`,
        icon: 'info',
        clientName: p.cliente_nombre,
      });
    });

    // 9. INFORMATIVO: Facturas pendientes
    works.filter(w =>
      w.status === 'factura_enviada' && !w.is_paid && w.due_date && !isPast(parseISO(w.due_date)) && !isToday(parseISO(w.due_date))
    ).forEach(work => {
      const dueDate = parseISO(work.due_date!);
      const daysUntilDue = differenceInDays(dueDate, now);
      const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);
      result.push({
        type: 'invoices_pending',
        priority: 'informativo',
        category: 'financial',
        work,
        message: `Factura pendiente`,
        details: `Vence en ${daysUntilDue} día${daysUntilDue > 1 ? 's' : ''} · ${formatCurrency(pendingAmount)}`,
        icon: 'info',
        clientName: work.client?.name,
      });
    });

    // 10. INFORMATIVO: Agenda próximos 7 días
    reminders.filter(r => {
      if (r.is_completed) return false;
      const reminderDate = parseISO(r.reminder_date);
      const in7Days = addDays(now, 7);
      return !isToday(reminderDate) && !isTomorrow(reminderDate) && !isPast(reminderDate) && isBefore(reminderDate, in7Days);
    }).forEach(reminder => {
      const reminderDate = parseISO(reminder.reminder_date);
      result.push({
        type: 'reminders_upcoming',
        priority: 'informativo',
        category: 'agenda',
        message: reminder.title,
        details: format(reminderDate, 'EEEE dd MMM', { locale: es }),
        icon: 'info',
      });
    });

    // 11. INFORMATIVO: Riesgo operativo
    const pendientesFacturar = works.filter(w => w.status === 'pendiente_facturar');
    if (pendientesFacturar.length >= 3) {
      const total = pendientesFacturar.reduce((sum, w) => sum + Number(w.amount), 0);
      result.push({
        type: 'risk_operational',
        priority: 'informativo',
        category: 'operational',
        work: pendientesFacturar[0],
        message: `Trabajos sin facturar`,
        details: `${pendientesFacturar.length} trabajos · ${formatCurrency(total)}`,
        icon: 'info',
      });
    }

    // 12. INFORMATIVO: Riesgo comercial
    const sinRespuesta = works.filter(w =>
      w.status === 'presupuesto_enviado' && w.budget_sent_at && differenceInDays(now, parseISO(w.budget_sent_at)) >= 3
    );
    if (sinRespuesta.length >= 5) {
      const total = sinRespuesta.reduce((sum, w) => sum + Number(w.amount), 0);
      result.push({
        type: 'risk_commercial',
        priority: 'informativo',
        category: 'commercial',
        work: sinRespuesta[0],
        message: `Presupuestos estancados`,
        details: `${sinRespuesta.length} presupuestos · ${formatCurrency(total)}`,
        icon: 'info',
      });
    }

    const prioridadOrden = { critico: 0, importante: 1, informativo: 2 };
    return result.sort((a, b) => prioridadOrden[a.priority] - prioridadOrden[b.priority]);
  }, [works, presupuestos, reminders]);

  const handleAlertClick = (alert: Alert) => {
    if (alert.work) {
      // Navigate with state - Index will handle opening the work detail
      navigate('/', { state: { openWorkId: alert.work.id, fromAlerts: true } });
    }
  };

  const scrollToSection = (category: AlertCategory) => {
    const refs: Record<AlertCategory, React.RefObject<HTMLDivElement | null>> = {
      financial: financialRef,
      commercial: commercialRef,
      agenda: agendaRef,
      operational: operationalRef,
    };
    refs[category].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (authLoading || worksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const financialAlerts = alerts.filter(a => a.category === 'financial');
  const commercialAlerts = alerts.filter(a => a.category === 'commercial');
  const operationalAlerts = alerts.filter(a => a.category === 'operational');
  const agendaAlerts = alerts.filter(a => a.category === 'agenda');

  const getPriorityBadge = (priority: AlertPriority) => {
    switch (priority) {
      case 'critico':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Crítico</Badge>;
      case 'importante':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Importante</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-border">Info</Badge>;
    }
  };

  const getAlertCard = (alert: Alert, index: number) => {
    const bgClass = alert.priority === 'critico'
      ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
      : alert.priority === 'importante'
        ? 'border-warning/30 bg-warning/5 hover:bg-warning/10'
        : 'border-border bg-card hover:bg-muted/50';

    const iconClass = alert.priority === 'critico'
      ? 'text-destructive'
      : alert.priority === 'importante'
        ? 'text-warning'
        : 'text-muted-foreground';

    return (
      <button
        key={`${alert.type}-${index}`}
        onClick={() => handleAlertClick(alert)}
        className={`w-full p-4 rounded-xl border transition-all text-left ${bgClass} ${alert.work ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${iconClass}`}>
            {alert.priority === 'critico' ? <XCircle className="w-5 h-5" /> :
              alert.priority === 'importante' ? <Clock className="w-5 h-5" /> :
                <Bell className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {alert.clientName && <span className="font-semibold text-foreground">{alert.clientName}</span>}
              {getPriorityBadge(alert.priority)}
            </div>
            <p className="text-sm font-medium text-foreground">{alert.message}</p>
            {alert.details && <p className="text-xs text-muted-foreground mt-1">{alert.details}</p>}
          </div>
        </div>
      </button>
    );
  };

  const renderCategory = (
    title: string,
    icon: React.ReactNode,
    categoryAlerts: Alert[],
    color: string,
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    if (categoryAlerts.length === 0) return null;
    const criticals = categoryAlerts.filter(a => a.priority === 'critico').length;
    const importants = categoryAlerts.filter(a => a.priority === 'importante').length;

    return (
      <div ref={ref}>
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${color}`}>
              {icon}
              {title}
              <span className="text-sm font-normal text-muted-foreground ml-2">({categoryAlerts.length})</span>
              {criticals > 0 && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 ml-auto">{criticals} críticas</Badge>
              )}
              {importants > 0 && (
                <Badge className="bg-warning/20 text-warning border-warning/30">{importants} importantes</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryAlerts.map((alert, index) => getAlertCard(alert, index))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Centro de Alertas
              </h1>
              <p className="text-sm text-muted-foreground">{alerts.length} alerta{alerts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container px-4 py-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {financialAlerts.length > 0 && (
            <button onClick={() => scrollToSection('financial')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">Financieras ({financialAlerts.length})</span>
            </button>
          )}
          {commercialAlerts.length > 0 && (
            <button onClick={() => scrollToSection('commercial')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Comerciales ({commercialAlerts.length})</span>
            </button>
          )}
          {agendaAlerts.length > 0 && (
            <button onClick={() => scrollToSection('agenda')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Agenda ({agendaAlerts.length})</span>
            </button>
          )}
          {operationalAlerts.length > 0 && (
            <button onClick={() => scrollToSection('operational')} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Operativas ({operationalAlerts.length})</span>
            </button>
          )}
        </div>

        <div className="space-y-6">
          {renderCategory('Alertas Financieras', <TrendingDown className="w-5 h-5" />, financialAlerts, 'text-destructive', financialRef)}
          {renderCategory('Alertas Comerciales', <FileText className="w-5 h-5" />, commercialAlerts, 'text-warning', commercialRef)}
          {renderCategory('Alertas de Agenda', <Calendar className="w-5 h-5" />, agendaAlerts, 'text-primary', agendaRef)}
          {renderCategory('Alertas Operativas', <Users className="w-5 h-5" />, operationalAlerts, 'text-muted-foreground', operationalRef)}
        </div>

        {alerts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">¡Todo bajo control!</h3>
            <p className="text-muted-foreground">No hay alertas pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
}

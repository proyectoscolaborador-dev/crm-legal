import { useState, useCallback } from 'react';
import { WorkWithClient, Client, STAGE_CONFIG } from '@/types/database';
import { Presupuesto } from '@/types/empresa';
import { Reminder } from './useReminders';
import { format, parseISO, isBefore, isToday, isTomorrow, addDays, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

// Types for CRM context
interface CRMContextData {
  works: WorkWithClient[];
  clients: Client[];
  presupuestos: Presupuesto[];
  reminders: Reminder[];
  pantalla: 'index' | 'analytics' | 'calendar' | 'clients';
  filtrosActivos?: {
    dateRange?: string;
    status?: string;
    client?: string;
    minAmount?: string;
    maxAmount?: string;
  };
}

interface DeudaCliente {
  clienteNombre: string;
  clienteId: string;
  deudaTotal: number;
  facturasVencidas: number;
  facturasPendientes: number;
}

interface AlertaCRM {
  tipo: string;
  prioridad: 'critico' | 'importante' | 'informativo';
  mensaje: string;
}

export function useAsistenteInteligente() {
  const [isLoading, setIsLoading] = useState(false);
  const [respuesta, setRespuesta] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Calculate overdue invoices
  const calcularFacturasVencidas = useCallback((works: WorkWithClient[]) => {
    const now = new Date();
    return works.filter(w => {
      if (w.status !== 'factura_enviada' || w.is_paid || !w.due_date) return false;
      return isBefore(parseISO(w.due_date), now);
    });
  }, []);

  // Calculate pending invoices (not yet due)
  const calcularFacturasPendientesCobro = useCallback((works: WorkWithClient[]) => {
    const now = new Date();
    return works.filter(w => {
      if (w.status !== 'factura_enviada' || w.is_paid) return false;
      if (!w.due_date) return true;
      return !isBefore(parseISO(w.due_date), now);
    });
  }, []);

  // Calculate debt by client
  const calcularDeudaPorCliente = useCallback((works: WorkWithClient[]): DeudaCliente[] => {
    const now = new Date();
    const deudaMap: Record<string, DeudaCliente> = {};

    works.forEach(work => {
      if (work.status !== 'factura_enviada' || work.is_paid) return;
      
      const clientId = work.client_id;
      const clientName = work.client?.name || 'Cliente desconocido';
      const deuda = Number(work.amount) - Number(work.advance_payments || 0);
      const vencida = work.due_date && isBefore(parseISO(work.due_date), now);

      if (!deudaMap[clientId]) {
        deudaMap[clientId] = {
          clienteNombre: clientName,
          clienteId: clientId,
          deudaTotal: 0,
          facturasVencidas: 0,
          facturasPendientes: 0,
        };
      }

      deudaMap[clientId].deudaTotal += deuda;
      if (vencida) {
        deudaMap[clientId].facturasVencidas++;
      } else {
        deudaMap[clientId].facturasPendientes++;
      }
    });

    return Object.values(deudaMap).sort((a, b) => b.deudaTotal - a.deudaTotal);
  }, []);

  // Get high debt clients (>5000€ or >2 overdue invoices)
  const clientesDeudaAlta = useCallback((deudaPorCliente: DeudaCliente[]) => {
    return deudaPorCliente.filter(d => d.deudaTotal > 5000 || d.facturasVencidas >= 2);
  }, []);

  // Get pending budgets to send
  const presupuestosPendientesEnvio = useCallback((presupuestos: Presupuesto[]) => {
    return presupuestos.filter(p => p.estado_presupuesto === 'borrador');
  }, []);

  // Get budgets without response too long (>7 days)
  const presupuestosSinRespuesta = useCallback((works: WorkWithClient[]) => {
    const now = new Date();
    return works.filter(w => {
      if (w.status !== 'presupuesto_enviado' || !w.budget_sent_at) return false;
      const daysSinceSent = differenceInDays(now, parseISO(w.budget_sent_at));
      return daysSinceSent >= 7;
    });
  }, []);

  // Get agenda alerts
  const alertasAgenda = useCallback((reminders: Reminder[]) => {
    const now = new Date();
    const in7Days = addDays(now, 7);
    
    return reminders.filter(r => {
      if (r.is_completed) return false;
      const reminderDate = parseISO(r.reminder_date);
      return isBefore(reminderDate, in7Days) || isToday(reminderDate);
    }).map(r => {
      const reminderDate = parseISO(r.reminder_date);
      let urgencia = 'normal';
      if (isToday(reminderDate)) urgencia = 'hoy';
      else if (isTomorrow(reminderDate)) urgencia = 'mañana';
      else if (isBefore(reminderDate, now)) urgencia = 'vencido';
      
      return { ...r, urgencia };
    });
  }, []);

  // Calculate all alerts
  const calcularAlertas = useCallback((data: CRMContextData): AlertaCRM[] => {
    const alertas: AlertaCRM[] = [];
    const now = new Date();

    // 1. Facturas vencidas (CRÍTICO)
    const facturasVencidas = calcularFacturasVencidas(data.works);
    facturasVencidas.forEach(w => {
      const diasVencida = differenceInDays(now, parseISO(w.due_date!));
      alertas.push({
        tipo: 'factura_vencida',
        prioridad: 'critico',
        mensaje: `Factura vencida: ${w.client?.name} - ${w.title} (${diasVencida} días)`,
      });
    });

    // 2. Clientes con deuda alta (CRÍTICO)
    const deudaPorCliente = calcularDeudaPorCliente(data.works);
    const clientesAlta = clientesDeudaAlta(deudaPorCliente);
    clientesAlta.forEach(c => {
      alertas.push({
        tipo: 'deuda_alta',
        prioridad: 'critico',
        mensaje: `Deuda alta: ${c.clienteNombre} - ${formatCurrency(c.deudaTotal)} (${c.facturasVencidas} vencidas)`,
      });
    });

    // 3. Agenda urgente (CRÍTICO/IMPORTANTE)
    const agendaAlertas = alertasAgenda(data.reminders);
    agendaAlertas.forEach(r => {
      alertas.push({
        tipo: 'agenda',
        prioridad: r.urgencia === 'vencido' || r.urgencia === 'hoy' ? 'critico' : 'importante',
        mensaje: `Agenda ${r.urgencia}: ${r.title}`,
      });
    });

    // 4. Presupuestos sin respuesta >7 días (IMPORTANTE)
    const sinRespuesta = presupuestosSinRespuesta(data.works);
    sinRespuesta.forEach(w => {
      const dias = differenceInDays(now, parseISO(w.budget_sent_at!));
      alertas.push({
        tipo: 'presupuesto_sin_respuesta',
        prioridad: 'importante',
        mensaje: `Sin respuesta: ${w.client?.name} - ${w.title} (${dias} días)`,
      });
    });

    // 5. Facturas pendientes de cobro no vencidas (INFORMATIVO)
    const pendientesCobro = calcularFacturasPendientesCobro(data.works);
    if (pendientesCobro.length > 0) {
      const total = pendientesCobro.reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0);
      alertas.push({
        tipo: 'facturas_pendientes',
        prioridad: 'informativo',
        mensaje: `${pendientesCobro.length} facturas pendientes de cobro: ${formatCurrency(total)}`,
      });
    }

    // 6. Presupuestos pendientes de envío (INFORMATIVO)
    const pendientesEnvio = presupuestosPendientesEnvio(data.presupuestos);
    if (pendientesEnvio.length > 0) {
      alertas.push({
        tipo: 'presupuestos_borrador',
        prioridad: 'informativo',
        mensaje: `${pendientesEnvio.length} presupuestos pendientes de enviar`,
      });
    }

    // Sort by priority
    const prioridadOrden = { critico: 0, importante: 1, informativo: 2 };
    return alertas.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);
  }, [calcularFacturasVencidas, calcularFacturasPendientesCobro, calcularDeudaPorCliente, clientesDeudaAlta, presupuestosSinRespuesta, presupuestosPendientesEnvio, alertasAgenda]);

  // Build full CRM context for Gemini
  const construirContextoCRM = useCallback((data: CRMContextData): string => {
    const now = new Date();
    const facturasVencidas = calcularFacturasVencidas(data.works);
    const facturasPendientes = calcularFacturasPendientesCobro(data.works);
    const deudaPorCliente = calcularDeudaPorCliente(data.works);
    const clientesAlta = clientesDeudaAlta(deudaPorCliente);
    const presupuestosBorrador = presupuestosPendientesEnvio(data.presupuestos);
    const sinRespuesta = presupuestosSinRespuesta(data.works);
    const agendaProxima = alertasAgenda(data.reminders);
    const alertas = calcularAlertas(data);

    // Calculate totals
    const totalCobrado = data.works
      .filter(w => w.is_paid || w.status === 'cobrado')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const totalPendienteCobro = facturasPendientes
      .reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0);

    const totalVencido = facturasVencidas
      .reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0);

    const deudaTotal = totalPendienteCobro + totalVencido;

    const trabajosEnObra = data.works.filter(w => w.status === 'presupuesto_aceptado');
    const trabajosPendientesFacturar = data.works.filter(w => w.status === 'pendiente_facturar');

    // Build context string
    let contexto = `
=== CONTEXTO CRM (${format(now, "dd/MM/yyyy HH:mm", { locale: es })}) ===

PANTALLA ACTUAL: ${data.pantalla}
${data.filtrosActivos ? `FILTROS ACTIVOS: ${JSON.stringify(data.filtrosActivos)}` : ''}

--- ALERTAS ACTIVAS (${alertas.length}) ---
${alertas.length === 0 ? 'Sin alertas activas' : alertas.map(a => `[${a.prioridad.toUpperCase()}] ${a.mensaje}`).join('\n')}

--- RESUMEN FINANCIERO ---
- Deuda total: ${formatCurrency(deudaTotal)}
- Pendiente de cobro (no vencido): ${formatCurrency(totalPendienteCobro)} (${facturasPendientes.length} facturas)
- Vencido (impagado): ${formatCurrency(totalVencido)} (${facturasVencidas.length} facturas)
- Total cobrado: ${formatCurrency(totalCobrado)}

--- DEUDA POR CLIENTE ---
${deudaPorCliente.length === 0 ? 'Sin deudas pendientes' : deudaPorCliente.slice(0, 10).map(d => 
  `- ${d.clienteNombre}: ${formatCurrency(d.deudaTotal)} (${d.facturasVencidas} vencidas, ${d.facturasPendientes} pendientes)`
).join('\n')}

--- CLIENTES CON DEUDA ALTA (>5000€ o ≥2 vencidas) ---
${clientesAlta.length === 0 ? 'Ninguno' : clientesAlta.map(c => 
  `- ${c.clienteNombre}: ${formatCurrency(c.deudaTotal)} (${c.facturasVencidas} vencidas)`
).join('\n')}

--- FACTURAS VENCIDAS (${facturasVencidas.length}) ---
${facturasVencidas.length === 0 ? 'Ninguna' : facturasVencidas.slice(0, 10).map(w => {
  const dias = differenceInDays(now, parseISO(w.due_date!));
  return `- ${w.client?.name}: ${w.title} - ${formatCurrency(Number(w.amount))} (vencida hace ${dias} días)`;
}).join('\n')}

--- PRESUPUESTOS ---
- Pendientes de envío (borrador): ${presupuestosBorrador.length}
- Sin respuesta >7 días: ${sinRespuesta.length}
${sinRespuesta.slice(0, 5).map(w => {
  const dias = differenceInDays(now, parseISO(w.budget_sent_at!));
  return `  · ${w.client?.name}: ${w.title} - ${formatCurrency(Number(w.amount))} (${dias} días sin respuesta)`;
}).join('\n')}

--- OBRAS Y TRABAJOS ---
- Clientes totales: ${data.clients.length}
- Trabajos activos: ${data.works.filter(w => w.status !== 'cobrado' && w.status !== 'trabajo_terminado').length}
- En obra: ${trabajosEnObra.length} por ${formatCurrency(trabajosEnObra.reduce((s, w) => s + Number(w.amount), 0))}
- Pendientes facturar: ${trabajosPendientesFacturar.length} por ${formatCurrency(trabajosPendientesFacturar.reduce((s, w) => s + Number(w.amount), 0))}

--- AGENDA PRÓXIMA (hoy + 7 días) ---
${agendaProxima.length === 0 ? 'Sin eventos próximos' : agendaProxima.slice(0, 10).map(r => 
  `- [${r.urgencia.toUpperCase()}] ${format(parseISO(r.reminder_date), 'dd/MM', { locale: es })}: ${r.title}`
).join('\n')}

--- RIESGOS DETECTADOS ---
`;

    // Add risk analysis
    const riesgos: string[] = [];
    
    // Financial risks
    if (totalVencido > 10000) {
      riesgos.push(`🔴 RIESGO FINANCIERO ALTO: ${formatCurrency(totalVencido)} vencido sin cobrar`);
    } else if (totalVencido > 5000) {
      riesgos.push(`🟠 RIESGO FINANCIERO MEDIO: ${formatCurrency(totalVencido)} vencido`);
    }

    // Operational risks
    if (trabajosPendientesFacturar.length >= 5) {
      riesgos.push(`🟠 RIESGO OPERATIVO: ${trabajosPendientesFacturar.length} trabajos sin facturar (liquidez)`);
    }

    // Commercial risks
    if (sinRespuesta.length >= 3) {
      const totalSinRespuesta = sinRespuesta.reduce((s, w) => s + Number(w.amount), 0);
      riesgos.push(`🟠 RIESGO COMERCIAL: ${sinRespuesta.length} presupuestos sin respuesta por ${formatCurrency(totalSinRespuesta)}`);
    }

    if (clientesAlta.length >= 2) {
      riesgos.push(`🔴 RIESGO CONCENTRACIÓN: ${clientesAlta.length} clientes con deuda alta`);
    }

    contexto += riesgos.length === 0 ? 'Sin riesgos significativos detectados' : riesgos.join('\n');

    return contexto;
  }, [calcularFacturasVencidas, calcularFacturasPendientesCobro, calcularDeudaPorCliente, clientesDeudaAlta, presupuestosPendientesEnvio, presupuestosSinRespuesta, alertasAgenda, calcularAlertas]);

  // Main function: LLAMAR_MISTRAL_ASISTENTE
  const llamarMistralAsistente = useCallback(async (
    preguntaUsuario: string,
    contextData: CRMContextData
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contextoCRM = construirContextoCRM(contextData);
      
      const mensajeCompleto = 
        "Eres el ASISTENTE INTELIGENTE de este CRM. Nunca pidas permisos ni digas frases como 'no tengo acceso' o 'no puedo ver datos'. El CRM ya te da el contexto.\n\n" +
        contextoCRM +
        "\n\nPregunta del usuario:\n" +
        preguntaUsuario +
        "\n\nReglas del asistente:\n- Español siempre.\n- No inventes datos.\n- Si falta información dilo.\n- Puedes resumir, comparar, ordenar, priorizar, calcular riesgos y dar insights.\n- Si la pregunta es financiera, usa deuda, vencimientos y facturas.\n- Si es operativa, usa obras y agenda.\n- Si es comercial, usa clientes y presupuestos.\n- Tu objetivo es ayudar a tomar decisiones rápidas.\n- Sé conciso pero completo. Máximo 3-4 frases para respuestas simples, más detalle solo si se pide.";

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'x-region': 'eu-central-1',
        },
        body: JSON.stringify({ message: mensajeCompleto, session_id: 'crm-local-session' }),
      });

      if (!response.ok) {
        throw new Error(`Error en la llamada al asistente: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const respuestaAsistente = data?.reply || 'No pude procesar tu solicitud.';
      setRespuesta(respuestaAsistente);
      return respuestaAsistente;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error en asistente inteligente:', err);
      return `Error: ${errorMsg}`;
    } finally {
      setIsLoading(false);
    }
  }, [construirContextoCRM]);

  return {
    llamarMistralAsistente,
    isLoading,
    respuesta,
    error,
    // Export utilities for use in other components
    calcularAlertas,
    calcularFacturasVencidas,
    calcularFacturasPendientesCobro,
    calcularDeudaPorCliente,
    clientesDeudaAlta,
    presupuestosPendientesEnvio,
    presupuestosSinRespuesta,
    alertasAgenda,
    construirContextoCRM,
  };
}

// Helper function
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

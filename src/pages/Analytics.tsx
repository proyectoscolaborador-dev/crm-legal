import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorks } from '@/hooks/useWorks';
import { useClients } from '@/hooks/useClients';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useReminders } from '@/hooks/useReminders';
import { useAsistenteInteligente } from '@/hooks/useAsistenteInteligente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  BarChart3, 
  Download, 
  FileText, 
  Filter, 
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Eye,
  Calendar,
  Euro,
  Loader2,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { STAGE_CONFIG, WorkStatus, WorkWithClient } from '@/types/database';
import { Presupuesto } from '@/types/empresa';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isAfter, isBefore, parseISO, addDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts';

// Types
interface FilterState {
  dateRange: 'all' | '7d' | '30d' | '90d' | '365d' | 'custom';
  startDate: string;
  endDate: string;
  status: string;
  client: string;
  minAmount: string;
  maxAmount: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Chart colors
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(160, 84%, 39%)', // emerald
  'hsl(38, 92%, 50%)',  // warning/amber
  'hsl(280, 65%, 60%)', // purple
  'hsl(200, 98%, 50%)', // blue
  'hsl(340, 82%, 52%)', // pink
];

// Demo data generator
const DEMO_CLIENTS = [
  { name: 'García Construcciones S.L.', company: 'García Construcciones', email: 'info@garciaconstrucciones.es', phone: '912345678', nif: 'B12345678' },
  { name: 'María López Arquitecta', company: 'Estudio López', email: 'maria@estudiolopez.com', phone: '623456789', nif: '12345678A' },
  { name: 'Reformas Modernas', company: 'Reformas Modernas S.A.', email: 'contacto@reformasmodernas.es', phone: '934567890', nif: 'A87654321' },
  { name: 'Hotel Playa Dorada', company: 'Hoteles Costa S.L.', email: 'mantenimiento@playadorada.com', phone: '956789012', nif: 'B98765432' },
  { name: 'Comunidad Edificio Sol', company: null, email: 'presidente@edificiosol.org', phone: '645678901', nif: 'H12349876' },
];

const DEMO_WORKS = [
  { title: 'Reforma integral cocina', description: 'Demolición, fontanería, electricidad y acabados', amount: 12500 },
  { title: 'Instalación aire acondicionado', description: 'Sistema multisplit 4x1 con bomba de calor', amount: 4800 },
  { title: 'Impermeabilización terraza', description: 'Membrana líquida + aislamiento térmico', amount: 3200 },
  { title: 'Reforma baño completo', description: 'Plato ducha, sanitarios, alicatado', amount: 6500 },
  { title: 'Instalación solar fotovoltaica', description: '10 paneles 450W + inversor + batería', amount: 15000 },
  { title: 'Pintura exterior fachada', description: 'Andamiaje, reparación grietas, pintura', amount: 8900 },
  { title: 'Cambio ventanas PVC', description: '8 ventanas oscilobatientes con rotura puente térmico', amount: 7200 },
  { title: 'Reforma local comercial', description: 'Adecuación para tienda de ropa', amount: 22000 },
  { title: 'Instalación domótica', description: 'Control iluminación, persianas, climatización', amount: 5500 },
  { title: 'Rehabilitación cubierta', description: 'Sustitución tejas, aislamiento, canalones', amount: 18000 },
];

const WORK_STATUSES: Array<{ status: WorkStatus; weight: number }> = [
  { status: 'presupuesto_solicitado', weight: 15 },
  { status: 'presupuesto_enviado', weight: 20 },
  { status: 'presupuesto_aceptado', weight: 15 },
  { status: 'pendiente_facturar', weight: 10 },
  { status: 'factura_enviada', weight: 20 },
  { status: 'cobrado', weight: 20 },
];

export default function Analytics() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { works, isLoading: worksLoading } = useWorks();
  const { clients } = useClients();
  const { presupuestos, isLoading: presupuestosLoading } = usePresupuestos();
  const { reminders } = useReminders();
  const { llamarMistralAsistente, isLoading: isAsistenteLoading } = useAsistenteInteligente();
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    status: 'all',
    client: 'all',
    minAmount: '',
    maxAmount: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // AI Assistant state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Generate demo data
  const generateDemoData = async () => {
    if (!user) return;
    setIsGeneratingDemo(true);
    
    try {
      const clientInserts = DEMO_CLIENTS.map(c => ({
        ...c,
        user_id: user.id,
        address: 'Calle Principal 123',
        city: 'Madrid',
        province: 'Madrid',
        postal_code: '28001',
        country: 'España',
      }));
      
      const { data: createdClients, error: clientError } = await supabase
        .from('clients')
        .insert(clientInserts)
        .select();
      
      if (clientError) throw clientError;
      
      const workInserts: any[] = [];
      const weightedStatuses: WorkStatus[] = [];
      WORK_STATUSES.forEach(ws => {
        for (let i = 0; i < ws.weight; i++) {
          weightedStatuses.push(ws.status);
        }
      });
      
      for (let i = 0; i < 25; i++) {
        const client = createdClients![i % createdClients!.length];
        const workTemplate = DEMO_WORKS[i % DEMO_WORKS.length];
        const status = weightedStatuses[Math.floor(Math.random() * weightedStatuses.length)];
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = subDays(new Date(), daysAgo);
        const amount = workTemplate.amount * (0.8 + Math.random() * 0.4);
        
        const work: any = {
          user_id: user.id,
          client_id: client.id,
          title: `${workTemplate.title} - ${client.name.split(' ')[0]}`,
          description: workTemplate.description,
          amount: Math.round(amount),
          status,
          position: i,
          created_at: createdAt.toISOString(),
          is_paid: status === 'cobrado',
          advance_payments: status === 'factura_enviada' ? Math.round(amount * 0.3) : 0,
        };
        
        if (status === 'presupuesto_enviado') {
          work.budget_sent_at = subDays(createdAt, -2).toISOString();
        }
        if (status === 'factura_enviada') {
          work.due_date = addDays(createdAt, 30).toISOString().split('T')[0];
        }
        
        workInserts.push(work);
      }
      
      const { data: createdWorks, error: workError } = await supabase
        .from('works')
        .insert(workInserts)
        .select();
      
      if (workError) throw workError;
      
      const presupuestoInserts = createdWorks!.map((work, idx) => {
        const client = createdClients!.find(c => c.id === work.client_id)!;
        const year = new Date(work.created_at).getFullYear();
        
        return {
          user_id: user.id,
          work_id: work.id,
          numero_presupuesto: `P-${year}-${String(idx + 1).padStart(4, '0')}`,
          cliente_nombre: client.name,
          cliente_email: client.email,
          cliente_telefono: client.phone,
          cliente_nif: client.nif,
          cliente_direccion: 'Calle Principal 123',
          cliente_ciudad: 'Madrid',
          cliente_cp: '28001',
          cliente_provincia: 'Madrid',
          obra_titulo: work.title,
          descripcion_trabajo_larga: work.description,
          partidas: [
            { descripcion: 'Mano de obra', cantidad: 1, precio_unitario: work.amount * 0.4, importe_linea: work.amount * 0.4 },
            { descripcion: 'Materiales', cantidad: 1, precio_unitario: work.amount * 0.5, importe_linea: work.amount * 0.5 },
            { descripcion: 'Varios', cantidad: 1, precio_unitario: work.amount * 0.1, importe_linea: work.amount * 0.1 },
          ],
          subtotal: work.amount,
          iva_porcentaje: 21,
          iva_importe: work.amount * 0.21,
          total_presupuesto: work.amount * 1.21,
          fecha_presupuesto: work.created_at.split('T')[0],
          validez_dias: 30,
          estado_presupuesto: work.status === 'presupuesto_solicitado' ? 'borrador' : 
                              work.status === 'presupuesto_enviado' ? 'enviado' : 'aceptado',
        };
      });
      
      const { error: presError } = await supabase
        .from('presupuestos')
        .insert(presupuestoInserts);
      
      if (presError) throw presError;
      
      queryClient.invalidateQueries({ queryKey: ['works'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      
      toast.success(`Creados: ${createdClients!.length} clientes, ${createdWorks!.length} trabajos`);
    } catch (error: any) {
      console.error('Error generating demo:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Filter logic
  const getDateRange = () => {
    const now = new Date();
    switch (filters.dateRange) {
      case '7d': return { start: subDays(now, 7), end: now };
      case '30d': return { start: subDays(now, 30), end: now };
      case '90d': return { start: subDays(now, 90), end: now };
      case '365d': return { start: subDays(now, 365), end: now };
      case 'custom': 
        return { 
          start: filters.startDate ? parseISO(filters.startDate) : null, 
          end: filters.endDate ? parseISO(filters.endDate) : null 
        };
      default: return { start: null, end: null };
    }
  };

  const filteredWorks = useMemo(() => {
    const dateRange = getDateRange();
    
    return works.filter(work => {
      // Date filter
      if (dateRange.start && dateRange.end) {
        const workDate = parseISO(work.created_at);
        if (isBefore(workDate, dateRange.start) || isAfter(workDate, dateRange.end)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status !== 'all' && work.status !== filters.status) {
        return false;
      }
      
      // Client filter
      if (filters.client !== 'all' && work.client_id !== filters.client) {
        return false;
      }
      
      // Amount filter
      const amount = Number(work.amount);
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) {
        return false;
      }
      
      return true;
    });
  }, [works, filters]);

  const filteredPresupuestos = useMemo(() => {
    const dateRange = getDateRange();
    
    return presupuestos.filter(p => {
      if (dateRange.start && dateRange.end) {
        const pDate = parseISO(p.fecha_presupuesto);
        if (isBefore(pDate, dateRange.start) || isAfter(pDate, dateRange.end)) {
          return false;
        }
      }
      
      if (filters.status !== 'all' && p.estado_presupuesto !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [presupuestos, filters]);

  // Statistics calculations
  const stats = useMemo(() => {
    const totalPresupuestos = filteredPresupuestos.reduce((sum, p) => sum + Number(p.total_presupuesto), 0);
    const presupuestosPendientes = filteredPresupuestos.filter(p => p.estado_presupuesto === 'borrador' || p.estado_presupuesto === 'enviado');
    const presupuestosAceptados = filteredPresupuestos.filter(p => p.estado_presupuesto === 'aceptado');
    
    const facturasEnviadas = filteredWorks.filter(w => w.status === 'factura_enviada');
    const facturasPendientesCobro = facturasEnviadas.filter(w => !w.is_paid);
    const facturasVencidas = facturasPendientesCobro.filter(w => {
      if (!w.due_date) return false;
      return isBefore(parseISO(w.due_date), new Date());
    });
    
    const totalCobrado = filteredWorks.filter(w => w.is_paid || w.status === 'cobrado')
      .reduce((sum, w) => sum + Number(w.amount), 0);
    
    const totalPendienteCobro = facturasPendientesCobro
      .reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0);
    
    const totalVencido = facturasVencidas
      .reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0);
    
    const anticiposRecibidos = filteredWorks.reduce((sum, w) => sum + Number(w.advance_payments || 0), 0);
    
    const enObra = filteredWorks.filter(w => w.status === 'presupuesto_aceptado')
      .reduce((sum, w) => sum + Number(w.amount), 0);
    
    const pendienteFacturar = filteredWorks.filter(w => w.status === 'pendiente_facturar')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    return {
      totalPresupuestos,
      presupuestosPendientes: presupuestosPendientes.length,
      presupuestosAceptados: presupuestosAceptados.length,
      totalCobrado,
      totalPendienteCobro,
      totalVencido,
      facturasVencidas: facturasVencidas.length,
      anticiposRecibidos,
      enObra,
      pendienteFacturar,
      trabajosActivos: filteredWorks.filter(w => w.status !== 'cobrado' && w.status !== 'trabajo_terminado').length,
    };
  }, [filteredWorks, filteredPresupuestos]);

  // Chart data
  const stageChartData = useMemo(() => {
    return Object.entries(STAGE_CONFIG).map(([status, config]) => {
      const stageWorks = filteredWorks.filter(w => w.status === status);
      return {
        name: config.label,
        cantidad: stageWorks.length,
        importe: stageWorks.reduce((sum, w) => sum + Number(w.amount), 0),
        color: config.color,
      };
    }).filter(d => d.cantidad > 0);
  }, [filteredWorks]);

  const monthlyChartData = useMemo(() => {
    const months: Record<string, { cobrado: number; facturado: number; presupuestado: number }> = {};
    
    filteredWorks.forEach(work => {
      const month = format(parseISO(work.created_at), 'MMM yy', { locale: es });
      if (!months[month]) {
        months[month] = { cobrado: 0, facturado: 0, presupuestado: 0 };
      }
      
      if (work.is_paid || work.status === 'cobrado') {
        months[month].cobrado += Number(work.amount);
      }
      if (work.status === 'factura_enviada') {
        months[month].facturado += Number(work.amount);
      }
    });
    
    filteredPresupuestos.forEach(p => {
      const month = format(parseISO(p.fecha_presupuesto), 'MMM yy', { locale: es });
      if (!months[month]) {
        months[month] = { cobrado: 0, facturado: 0, presupuestado: 0 };
      }
      months[month].presupuestado += Number(p.total_presupuesto);
    });
    
    return Object.entries(months).map(([name, data]) => ({ name, ...data }));
  }, [filteredWorks, filteredPresupuestos]);

  const clientChartData = useMemo(() => {
    const clientTotals: Record<string, number> = {};
    
    filteredWorks.forEach(work => {
      const clientName = work.client?.name || 'Sin cliente';
      clientTotals[clientName] = (clientTotals[clientName] || 0) + Number(work.amount);
    });
    
    return Object.entries(clientTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredWorks]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // AI Assistant functions - using the new hook with filtered context
  const processAiResponse = (response: string) => {
    // Process filter commands
    const dateMatch = response.match(/\[FILTRO_FECHA:\s*(\w+)\]/);
    if (dateMatch) {
      const value = dateMatch[1] as FilterState['dateRange'];
      setFilters(f => ({ ...f, dateRange: value }));
      toast.success(`Filtro de fecha aplicado: ${value}`);
    }
    
    const statusMatch = response.match(/\[FILTRO_ESTADO:\s*(\w+)\]/);
    if (statusMatch) {
      setFilters(f => ({ ...f, status: statusMatch[1] }));
      toast.success('Filtro de estado aplicado');
    }
    
    const clientMatch = response.match(/\[FILTRO_CLIENTE:\s*(\w+)\]/);
    if (clientMatch) {
      setFilters(f => ({ ...f, client: clientMatch[1] }));
      toast.success('Filtro de cliente aplicado');
    }
    
    const exportMatch = response.match(/\[EXPORTAR:\s*(\w+)\]/);
    if (exportMatch) {
      handleExport(exportMatch[1] as 'csv' | 'pdf');
    }
    
    // Clean response
    return response
      .replace(/\[FILTRO_FECHA:\s*\w+\]/g, '')
      .replace(/\[FILTRO_ESTADO:\s*\w+\]/g, '')
      .replace(/\[FILTRO_CLIENTE:\s*\w+\]/g, '')
      .replace(/\[EXPORTAR:\s*\w+\]/g, '')
      .trim();
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAiLoading(true);
    
    try {
      // Build context with filtered data for analytics
      const contextData = {
        works: filteredWorks as any[], // Use filtered works
        clients,
        presupuestos: filteredPresupuestos as any[],
        reminders,
        pantalla: 'analytics' as const,
        filtrosActivos: {
          dateRange: filters.dateRange,
          status: filters.status,
          client: filters.client === 'all' ? 'Todos' : clients.find(c => c.id === filters.client)?.name || 'N/A',
          minAmount: filters.minAmount,
          maxAmount: filters.maxAmount,
        },
      };

      // Add extra instructions for analytics context
      const preguntaConContexto = `
${userMessage}

INSTRUCCIONES ADICIONALES PARA ANALÍTICAS:
- Responde sobre los datos FILTRADOS actualmente, no sobre todos los datos.
- Si el usuario pregunta "qué deuda hay" o similar, usa solo los datos del filtro actual.
- Si el usuario quiere datos globales, acláralo y menciona que está viendo datos filtrados.
- Puedes usar comandos de acción:
  [FILTRO_FECHA: 7d|30d|90d|365d|all]
  [FILTRO_ESTADO: presupuesto_solicitado|presupuesto_enviado|presupuesto_aceptado|pendiente_facturar|factura_enviada|cobrado|all]
  [FILTRO_CLIENTE: id_cliente|all]
  [EXPORTAR: csv|pdf]
- Sé conciso pero completo.
`;

      const respuesta = await llamarMistralAsistente(preguntaConContexto, contextData);
      const cleanedResponse = processAiResponse(respuesta);
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: cleanedResponse }]);
    } catch (error) {
      console.error('AI Error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error al procesar. Intenta de nuevo.' 
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Voice recognition
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
    };
    
    recognitionRef.current = recognition;
    recognition.start();
  };

  // Export functions
  const handleExport = (type: 'csv' | 'pdf') => {
    if (type === 'csv') {
      exportToCSV();
    } else {
      toast.info('Exportación PDF en desarrollo');
    }
  };

  const exportToCSV = () => {
    const headers = ['Título', 'Cliente', 'Importe', 'Estado', 'Fecha'];
    const rows = filteredWorks.map(w => [
      w.title,
      w.client?.name || 'N/A',
      w.amount,
      STAGE_CONFIG[w.status]?.label || w.status,
      format(parseISO(w.created_at), 'dd/MM/yyyy')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analíticas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('CSV descargado');
  };

  // Reset data
  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      await supabase.from('presupuestos').delete().eq('user_id', user.id);
      await supabase.from('works').delete().eq('user_id', user.id);
      await supabase.from('clients').delete().eq('user_id', user.id);
      await supabase.from('reminders').delete().eq('user_id', user.id);
      
      toast.success('Datos eliminados');
      setResetDialogOpen(false);
      navigate('/');
    } catch (error) {
      toast.error('Error al resetear');
    } finally {
      setIsResetting(false);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Loading state
  if (authLoading || worksLoading || presupuestosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Centro de Analíticas</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* DEMO BUTTON - DELETE LATER */}
            <Button 
              variant="default" 
              size="sm" 
              onClick={generateDemoData}
              disabled={isGeneratingDemo}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGeneratingDemo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              PRUEBA
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setResetDialogOpen(true)}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
        {/* Main Content */}
        <main className="flex-1 container px-4 py-6 space-y-6 overflow-y-auto">
          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros Avanzados
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setFilters({
                  dateRange: 'all', startDate: '', endDate: '', status: 'all', client: 'all', minAmount: '', maxAmount: ''
                })}>
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Período</label>
                  <Select value={filters.dateRange} onValueChange={(v) => setFilters(f => ({ ...f, dateRange: v as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo el tiempo</SelectItem>
                      <SelectItem value="7d">Últimos 7 días</SelectItem>
                      <SelectItem value="30d">Últimos 30 días</SelectItem>
                      <SelectItem value="90d">Últimos 90 días</SelectItem>
                      <SelectItem value="365d">Último año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
                  <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STAGE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Cliente</label>
                  <Select value={filters.client} onValueChange={(v) => setFilters(f => ({ ...f, client: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">Min €</label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      value={filters.minAmount}
                      onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground mb-1 block">Max €</label>
                    <Input 
                      type="number" 
                      placeholder="∞" 
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cobrado</span>
              </div>
              <p className="text-xl font-bold text-primary">{formatCurrency(stats.totalCobrado)}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Pdte. Cobro</span>
              </div>
              <p className="text-xl font-bold text-amber-500">{formatCurrency(stats.totalPendienteCobro)}</p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Vencido</span>
              </div>
              <p className="text-xl font-bold text-destructive">{formatCurrency(stats.totalVencido)}</p>
              {stats.facturasVencidas > 0 && (
                <span className="text-xs text-destructive/80">{stats.facturasVencidas} facturas</span>
              )}
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Pdte. Facturar</span>
              </div>
              <p className="text-xl font-bold text-emerald-500">{formatCurrency(stats.pendienteFacturar)}</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="dashboard" className="gap-2">
                <PieChart className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="presupuestos" className="gap-2">
                <FileText className="w-4 h-4" />
                Presupuestos
              </TabsTrigger>
              <TabsTrigger value="facturas" className="gap-2">
                <FileCheck className="w-4 h-4" />
                Facturas
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-2">
                <Users className="w-4 h-4" />
                Clientes
              </TabsTrigger>
            </TabsList>
            
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stage Distribution */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Por Etapa
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stageChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tickFormatter={(v) => `${v/1000}k`} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="importe" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Top Clients */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Top Clientes
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={clientChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {clientChartData.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolución Mensual
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Area type="monotone" dataKey="cobrado" name="Cobrado" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="facturado" name="Facturado" stackId="2" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.4} />
                      <Area type="monotone" dataKey="presupuestado" name="Presupuestado" stackId="3" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            {/* Presupuestos Tab */}
            <TabsContent value="presupuestos" className="mt-6">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPresupuestos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay presupuestos con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPresupuestos.map(p => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm">{p.numero_presupuesto}</TableCell>
                          <TableCell>{p.cliente_nombre}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{p.obra_titulo}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(p.total_presupuesto)}</TableCell>
                          <TableCell>
                            <Badge variant={p.estado_presupuesto === 'aceptado' ? 'default' : 'secondary'}>
                              {p.estado_presupuesto}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(parseISO(p.fecha_presupuesto), 'dd/MM/yy')}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/presupuesto/${p.id}`)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Facturas Tab */}
            <TabsContent value="facturas" className="mt-6">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Anticipo</TableHead>
                      <TableHead>Pendiente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vencimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorks.filter(w => w.status === 'factura_enviada' || w.status === 'cobrado').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay facturas con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorks
                        .filter(w => w.status === 'factura_enviada' || w.status === 'cobrado')
                        .map(w => {
                          const pending = Number(w.amount) - Number(w.advance_payments || 0);
                          const isOverdue = w.due_date && isBefore(parseISO(w.due_date), new Date()) && !w.is_paid;
                          
                          return (
                            <TableRow key={w.id} className={`hover:bg-muted/30 ${isOverdue ? 'bg-destructive/5' : ''}`}>
                              <TableCell className="font-medium">{w.title}</TableCell>
                              <TableCell>{w.client?.name || 'N/A'}</TableCell>
                              <TableCell>{formatCurrency(w.amount)}</TableCell>
                              <TableCell className="text-emerald-600">{formatCurrency(w.advance_payments || 0)}</TableCell>
                              <TableCell className={pending > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                                {formatCurrency(pending)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={w.is_paid ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                                  {w.is_paid ? 'Cobrada' : isOverdue ? 'Vencida' : 'Pendiente'}
                                </Badge>
                              </TableCell>
                              <TableCell className={isOverdue ? 'text-destructive' : ''}>
                                {w.due_date ? format(parseISO(w.due_date), 'dd/MM/yy') : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Clientes Tab */}
            <TabsContent value="clientes" className="mt-6">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Trabajos</TableHead>
                      <TableHead>Total Facturado</TableHead>
                      <TableHead>Cobrado</TableHead>
                      <TableHead>Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => {
                      const clientWorks = filteredWorks.filter(w => w.client_id === client.id);
                      const totalFacturado = clientWorks.reduce((sum, w) => sum + Number(w.amount), 0);
                      const totalCobrado = clientWorks.filter(w => w.is_paid).reduce((sum, w) => sum + Number(w.amount), 0);
                      const pendiente = totalFacturado - totalCobrado;
                      
                      return (
                        <TableRow key={client.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.company || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{clientWorks.length}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(totalFacturado)}</TableCell>
                          <TableCell className="text-emerald-600">{formatCurrency(totalCobrado)}</TableCell>
                          <TableCell className={pendiente > 0 ? 'text-amber-600 font-semibold' : ''}>
                            {formatCurrency(pendiente)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* AI Sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Asistente de Analíticas</h3>
              <p className="text-xs text-muted-foreground">Pregunta lo que necesites</p>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] lg:max-h-none">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Pregúntame sobre tus datos:</p>
                <div className="mt-4 space-y-2">
                  {[
                    '¿Cuál es la deuda pendiente por cliente?', 
                    '¿Qué facturas están vencidas?', 
                    '¿Cuánto he cobrado este mes?',
                    'Dame un resumen de riesgos',
                    'Exportar datos a CSV'
                  ].map((q, i) => (
                    <button 
                      key={i}
                      onClick={() => { setChatInput(q); }}
                      className="block w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted rounded-bl-md prose prose-sm dark:prose-invert max-w-none'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            
            {isAiLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-2xl rounded-bl-md">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant={isListening ? 'default' : 'outline'}
                size="icon"
                onClick={toggleVoice}
                className={isListening ? 'animate-pulse' : ''}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                placeholder="Escribe o habla..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={isAiLoading || !chatInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Reset Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              ¿Eliminar todos los datos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos tus datos. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isResetting}
            >
              {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar todo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

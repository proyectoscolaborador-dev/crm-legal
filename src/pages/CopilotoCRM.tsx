import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Send, Loader2, Bot, User, Zap, Eye, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { useReminders } from '@/hooks/useReminders';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ExecutedAction {
  action: {
    type: string;
    entity: string;
    id?: string;
    data?: Record<string, unknown>;
  };
  success: boolean;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ExecutedAction[];
}

type AssistantMode = 'read' | 'operate';

const CHAT_STORAGE_KEY = 'copiloto-crm-messages';

export default function CopilotoCRM() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Usar los hooks que ya manejan el DEFAULT_USER_ID
  const { clients } = useClients();
  const { works } = useWorks();
  const { reminders } = useReminders();
  const { presupuestos } = usePresupuestos();
  
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
    return [];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('read');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Force read mode if user is not authenticated
  useEffect(() => {
    if (!user && mode === 'operate') {
      setMode('read');
    }
  }, [user, mode]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Usar setTimeout para asegurar que el DOM se actualice primero
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build context with OPTIMIZED CRM data (reduce tokens)
  const buildContext = useCallback(() => {
    // Calcular estadísticas
    const cobrados = works.filter(w => w.is_paid || w.status === 'cobrado');
    const pendientes = works.filter(w => !w.is_paid && w.status !== 'cobrado');
    const importeCobrado = cobrados.reduce((sum, w) => sum + Number(w.amount), 0);
    const importePendiente = pendientes.reduce((sum, w) => sum + Number(w.amount), 0);
    const anticipos = works.reduce((sum, w) => sum + Number(w.advance_payments || 0), 0);
    
    // Presupuestos por estado
    const presBorrador = presupuestos.filter(p => p.estado_presupuesto === 'borrador');
    const presEnviado = presupuestos.filter(p => p.estado_presupuesto === 'enviado');
    const presAceptado = presupuestos.filter(p => p.estado_presupuesto === 'aceptado');
    
    // Recordatorios pendientes
    const recordatoriosPendientes = reminders.filter(r => !r.is_completed);
    
    return {
      currentUser: user ? { id: user.id, email: user.email } : undefined,
      currentRoute: '/copiloto',
      // Enviar solo los últimos 15 registros de cada tipo para reducir tokens
      lastRecords: {
        clientes: clients.slice(0, 15).map(c => ({
          id: c.id,
          name: c.name,
          company: c.company,
          phone: c.phone,
          email: c.email,
          city: c.city
        })),
        citas: recordatoriosPendientes.slice(0, 10).map(r => ({
          id: r.id,
          title: r.title,
          reminder_date: r.reminder_date,
          reminder_type: r.reminder_type
        })),
        presupuestos: presupuestos.slice(0, 15).map(p => ({
          id: p.id,
          numero_presupuesto: p.numero_presupuesto,
          cliente_nombre: p.cliente_nombre,
          obra_titulo: p.obra_titulo,
          total_presupuesto: p.total_presupuesto,
          estado_presupuesto: p.estado_presupuesto
        })),
        facturas: works.slice(0, 15).map(w => ({
          id: w.id,
          title: w.title,
          amount: w.amount,
          status: w.status,
          is_paid: w.is_paid,
          client_name: w.client?.name
        }))
      },
      // Estadísticas COMPLETAS (esto es lo importante para responder preguntas)
      stats: {
        total_clientes: clients.length,
        total_trabajos: works.length,
        total_presupuestos: presupuestos.length,
        total_recordatorios: reminders.length,
        recordatorios_pendientes: recordatoriosPendientes.length,
        trabajos_cobrados: cobrados.length,
        trabajos_pendientes: pendientes.length,
        importe_total_trabajos: works.reduce((sum, w) => sum + Number(w.amount), 0),
        importe_cobrado: importeCobrado,
        importe_pendiente: importePendiente,
        anticipos_recibidos: anticipos,
        pendiente_real: importePendiente - anticipos,
        presupuestos_borrador: presBorrador.length,
        presupuestos_enviados: presEnviado.length,
        presupuestos_aceptados: presAceptado.length,
        valor_presupuestos: presupuestos.reduce((sum, p) => sum + Number(p.total_presupuesto), 0),
        valor_presupuestos_borrador: presBorrador.reduce((sum, p) => sum + Number(p.total_presupuesto), 0),
        valor_presupuestos_enviados: presEnviado.reduce((sum, p) => sum + Number(p.total_presupuesto), 0),
        valor_presupuestos_aceptados: presAceptado.reduce((sum, p) => sum + Number(p.total_presupuesto), 0)
      }
    };
  }, [user, clients, reminders, presupuestos, works]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const context = buildContext();
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      // Force 'read' mode if user is not authenticated
      const effectiveMode = user ? mode : 'read';

      const { data, error } = await supabase.functions.invoke('assistant', {
        body: {
          mode: effectiveMode,
          messages: allMessages,
          context
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.reply || 'Lo siento, no pude procesar tu solicitud.',
        timestamp: new Date(),
        actions: data?.executedActions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If actions were executed, refresh data
      if (data?.executedActions && data.executedActions.length > 0) {
        const successfulActions = data.executedActions.filter((a: ExecutedAction) => a.success);
        if (successfulActions.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          queryClient.invalidateQueries({ queryKey: ['works'] });
          queryClient.invalidateQueries({ queryKey: ['reminders'] });
          queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
          
          toast.success(`${successfulActions.length} acción(es) ejecutada(s) correctamente`);
        }
        
        const failedActions = data.executedActions.filter((a: ExecutedAction) => !a.success);
        if (failedActions.length > 0) {
          toast.error(`${failedActions.length} acción(es) fallaron`);
        }
      }

    } catch (error: any) {
      console.error('Error calling assistant:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Lo siento, hubo un error al procesar tu solicitud: ${msg}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error al comunicar con el asistente');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success('Historial borrado');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="transition-transform active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Copiloto del CRM</h1>
            <p className="text-xs text-muted-foreground">
              {clients.length} clientes · {works.length} trabajos · {presupuestos.length} presupuestos
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1">
                <Eye className={`w-3.5 h-3.5 ${mode === 'read' ? 'text-primary' : 'text-muted-foreground'}`} />
                <Switch
                  checked={mode === 'operate'}
                  onCheckedChange={(checked) => setMode(checked ? 'operate' : 'read')}
                  className="scale-75"
                />
                <Zap className={`w-3.5 h-3.5 ${mode === 'operate' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">
                Solo lectura
              </Badge>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="w-4 h-4" />
              <span>Mistral AI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Indicator */}
      <div className="flex-shrink-0 px-4 py-2 bg-muted/30 border-b border-border">
        <div className="container flex items-center gap-2">
          <Badge variant={mode === 'operate' ? 'default' : 'secondary'} className="text-xs">
            {mode === 'read' ? '👁 Modo Lectura' : '⚡ Modo Operación'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {mode === 'read' ? 'Consulta tus datos del CRM' : 'Puede crear, editar y eliminar registros'}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    ¡Hola! Soy tu Copiloto
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Tengo acceso a <strong>{clients.length} clientes</strong>, <strong>{works.length} trabajos</strong>, <strong>{presupuestos.length} presupuestos</strong> y <strong>{reminders.length} recordatorios</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {[
                    '¿Cuánto tengo pendiente de cobrar?',
                    '¿Qué recordatorios tengo pendientes?',
                    'Dame un resumen de mis datos',
                    '¿Cuáles son mis mejores clientes?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-2 text-xs text-left rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-foreground text-background'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-foreground text-background rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    
                    {/* Show executed actions */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="space-y-1">
                        {message.actions.map((action, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                              action.success 
                                ? 'bg-green-500/10 text-green-600' 
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {action.success ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>
                              {action.action.type.replace('_', ' ')} {action.action.entity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analizando tus datos...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'read' ? 'Pregunta sobre tus datos...' : 'Pide una acción sobre tus datos...'}
              className="flex-1 bg-muted border-0 focus-visible:ring-1 h-12 text-base"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="h-12 px-6 gap-2 transition-transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Borrar historial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

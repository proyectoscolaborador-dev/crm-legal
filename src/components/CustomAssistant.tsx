import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  X, 
  MessageSquare,
  Zap,
  Eye,
  CheckCircle2,
  XCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { supabase } from '@/lib/externalSupabase';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { useReminders } from '@/hooks/useReminders';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ExecutedAction[];
}

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

type AssistantMode = 'read' | 'operate';

const CHAT_STORAGE_KEY = 'custom-assistant-messages';

export function CustomAssistant() {
  const { user } = useAuth();
  const { clients } = useClients();
  const { works } = useWorks();
  const { reminders } = useReminders();
  const { presupuestos } = usePresupuestos();
  const location = useLocation();
  const queryClient = useQueryClient();

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Default to 'read' mode, and force 'read' if user is not authenticated
  const [mode, setMode] = useState<AssistantMode>('read');
  
  // Force read mode if user is not authenticated
  useEffect(() => {
    if (!user && mode === 'operate') {
      setMode('read');
    }
  }, [user, mode]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + ' ' + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Error en reconocimiento de voz');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('🎤 Escuchando... habla ahora');
    }
  };

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
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

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const buildContext = useCallback(() => {
    // Calcular estadísticas
    const cobrados = works.filter(w => w.is_paid || w.status === 'cobrado');
    const pendientes = works.filter(w => !w.is_paid && w.status !== 'cobrado');
    const importeCobrado = cobrados.reduce((sum, w) => sum + Number(w.amount), 0);
    const importePendiente = pendientes.reduce((sum, w) => sum + Number(w.amount), 0);
    const anticipos = works.reduce((sum, w) => sum + Number(w.advance_payments || 0), 0);
    
    const presBorrador = presupuestos.filter(p => p.estado_presupuesto === 'borrador');
    const presEnviado = presupuestos.filter(p => p.estado_presupuesto === 'enviado');
    const presAceptado = presupuestos.filter(p => p.estado_presupuesto === 'aceptado');
    
    const recordatoriosPendientes = reminders.filter(r => !r.is_completed);
    
    return {
      currentUser: user ? { id: user.id, email: user.email } : undefined,
      currentRoute: location.pathname,
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
        valor_presupuestos: presupuestos.reduce((sum, p) => sum + Number(p.total_presupuesto), 0)
      }
    };
  }, [user, location.pathname, clients, reminders, presupuestos, works]);

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
      const { data, error } = await supabase.functions.invoke('assistant', {
        body: { message: messageToSend }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

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
          // Invalidate queries to refresh data
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

    } catch (error) {
      console.error('Error calling assistant:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Lo siento, hubo un error: ${msg}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error al comunicar con el asistente');
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
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

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform md:bottom-4"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[70vh] md:bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Copiloto</h3>
            <p className="text-xs text-muted-foreground">Asistente CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode Toggle - Only show if user is authenticated */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-background rounded-full px-2 py-1">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="px-3 py-1.5 bg-muted/30 border-b border-border">
        <Badge variant={mode === 'operate' ? 'default' : 'secondary'} className="text-xs">
          {mode === 'read' ? '👁 Modo Lectura' : '⚡ Modo Operación'}
        </Badge>
        <span className="text-xs text-muted-foreground ml-2">
          {mode === 'read' ? 'Solo consultas' : 'Puede ejecutar acciones'}
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                ¡Hola! Soy tu Copiloto con Mistral AI.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'read' 
                  ? 'Pregúntame sobre tu CRM' 
                  : 'Puedo crear, editar y eliminar registros'}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-2 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                </div>
                <div className="space-y-1">
                  <div
                    className={`rounded-xl px-3 py-2 text-sm ${
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
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
              <div className="flex gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="rounded-xl rounded-tl-sm px-3 py-2 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            className={`h-10 w-10 flex-shrink-0 rounded-lg ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-primary/10'}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Escuchando...' : (mode === 'read' ? 'Pregunta algo...' : 'Pide una acción...')}
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            disabled={isLoading || isListening}
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            Borrar historial
          </button>
        )}
      </div>
    </div>
  );
}

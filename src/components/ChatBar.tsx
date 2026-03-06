import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
  XCircle,
  Trash2,
  Mic,
  MicOff
} from 'lucide-react';
import { supabase } from '@/lib/externalSupabase';
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

const CHAT_STORAGE_KEY = 'chatbar-messages';

export function ChatBar() {
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        textareaRef.current?.focus();
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isExpanded]);

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

  const buildContext = useCallback(() => {
    return {
      currentRoute: location.pathname,
      lastRecords: {
        clientes: clients.slice(0, 10).map(c => ({
          id: c.id,
          name: c.name,
          company: c.company,
          phone: c.phone,
          email: c.email
        })),
        citas: reminders.slice(0, 10).map(r => ({
          id: r.id,
          title: r.title,
          reminder_date: r.reminder_date,
          reminder_type: r.reminder_type,
          is_completed: r.is_completed
        })),
        presupuestos: presupuestos.slice(0, 10).map(p => ({
          id: p.id,
          numero_presupuesto: p.numero_presupuesto,
          cliente_nombre: p.cliente_nombre,
          obra_titulo: p.obra_titulo,
          total_presupuesto: p.total_presupuesto,
          estado_presupuesto: p.estado_presupuesto
        })),
        trabajos: works.slice(0, 10).map(w => ({
          id: w.id,
          title: w.title,
          amount: w.amount,
          status: w.status,
          is_paid: w.is_paid
        }))
      }
    };
  }, [location.pathname, clients, reminders, presupuestos, works]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('assistant', {
        body: { message: userMessage.content }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.reply || 'Acción completada.',
        timestamp: new Date(),
        actions: data?.executedActions
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data?.executedActions?.length > 0) {
        const successfulActions = data.executedActions.filter((a: ExecutedAction) => a.success);
        if (successfulActions.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          queryClient.invalidateQueries({ queryKey: ['works'] });
          queryClient.invalidateQueries({ queryKey: ['reminders'] });
          queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
          toast.success(`✅ ${successfulActions.length} acción(es) ejecutada(s)`);
        }
        
        const failedActions = data.executedActions.filter((a: ExecutedAction) => !a.success);
        if (failedActions.length > 0) {
          toast.error(`${failedActions.length} acción(es) fallaron`);
        }
      }

    } catch (error) {
      console.error('Error calling assistant:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${msg}`,
        timestamp: new Date(),
      }]);
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

  const quickAction = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-card via-card to-card/95 border-t-2 border-primary/20 shadow-2xl">
      {/* Expanded Chat Area */}
      {isExpanded && (
        <div className="h-[350px] border-b border-primary/10 bg-gradient-to-b from-background/50 to-background">
          <div className="h-full overflow-y-auto p-4 scroll-smooth scrollbar-thin">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    🚀 Bot de Ejecución
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Soy un bot de ejecución de tareas.<br/>
                    Para consultas y analíticas, acude a esas secciones.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button 
                      onClick={() => quickAction('Crea un cliente nuevo llamado ')}
                      className="text-xs bg-primary/15 hover:bg-primary/25 text-primary px-3 py-2 rounded-lg transition-colors"
                    >
                      ➕ Nuevo cliente
                    </button>
                    <button 
                      onClick={() => quickAction('Añade un recordatorio para ')}
                      className="text-xs bg-secondary/15 hover:bg-secondary/25 text-secondary px-3 py-2 rounded-lg transition-colors"
                    >
                      📅 Recordatorio
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-foreground text-background'
                          : 'bg-gradient-to-br from-primary to-secondary text-primary-foreground'
                      }`}
                    >
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1.5">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          message.role === 'user'
                            ? 'bg-foreground text-background rounded-tr-md'
                            : 'bg-card border border-border text-foreground rounded-tl-md'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {message.actions.map((action, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                                action.success 
                                  ? 'bg-green-500/15 text-green-400' 
                                  : 'bg-red-500/15 text-red-400'
                              }`}
                            >
                              {action.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{action.action.type} {action.action.entity}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-in fade-in">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Ejecutando...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input Bar - Always visible */}
      <div className="p-3 bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 h-10 w-10 rounded-xl hover:bg-primary/10"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </Button>

          {/* Bot Icon with gradient */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>

          {/* Input - Larger for mobile */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-expand chat when user starts typing
                if (e.target.value.trim() && !isExpanded) {
                  setIsExpanded(true);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Also expand when focusing the input
                if (!isExpanded) {
                  setIsExpanded(true);
                }
              }}
              placeholder="Ejecutar: crear cliente, recordatorio..."
              className="min-h-[44px] max-h-[80px] resize-none rounded-xl border-primary/20 focus:border-primary/40 bg-background/50 pr-12 text-base py-3"
              disabled={isLoading}
              rows={1}
            />
            {/* Voice Button inside textarea */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-primary/10'}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>

          {/* Clear History */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-destructive rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  Zap,
  CheckCircle2,
  XCircle,
  Trash2,
  Sparkles,
  Mic,
  MicOff,
  CalendarPlus
} from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/externalSupabase';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { useReminders } from '@/hooks/useReminders';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';

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

const OBRA_CHAT_KEY = 'obra-assistant-messages';

export function ObraAssistant() {
  const { clients } = useClients();
  const { works } = useWorks();
  const { reminders } = useReminders();
  const { presupuestos } = usePresupuestos();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(OBRA_CHAT_KEY);
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
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem(OBRA_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

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
      toast.info('Escuchando... habla ahora');
    }
  };

  const buildContext = useCallback(() => {
    return {
      currentRoute: '/obra',
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
  }, [clients, reminders, presupuestos, works]);

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
      }

    } catch (error) {
      console.error('Error:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${msg}`,
        timestamp: new Date(),
      }]);
      toast.error('Error al ejecutar');
    } finally {
      setIsLoading(false);
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
    localStorage.removeItem(OBRA_CHAT_KEY);
    toast.success('Historial borrado');
  };

  const quickAction = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 overflow-hidden">
      {/* Messages Area */}
      <div className="h-[300px] overflow-y-auto p-4 space-y-4 scrollbar-thin">
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
              <button 
                onClick={() => quickAction('Crea un trabajo para el cliente ')}
                className="text-xs bg-warning/15 hover:bg-warning/25 text-warning px-3 py-2 rounded-lg transition-colors"
              >
                🔨 Nuevo trabajo
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className={`flex gap-3 max-w-[90%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                  message.role === 'user'
                    ? 'bg-foreground text-background'
                    : 'bg-gradient-to-br from-primary to-secondary text-primary-foreground'
                }`}
              >
                {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className="space-y-2">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    message.role === 'user'
                      ? 'bg-foreground text-background rounded-tr-sm'
                      : 'bg-muted/50 border border-border text-foreground rounded-tl-sm'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
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
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
                          action.success 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {action.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/50 border border-border">
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

      {/* Input Area */}
      <div className="p-4 bg-background/50 border-t border-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Crea un recordatorio para llamar a Juan mañana..."
              className="min-h-[60px] max-h-[120px] resize-none rounded-xl border-primary/20 focus:border-primary/40 bg-card pr-12 text-base"
              disabled={isLoading}
            />
            {/* Voice Button inside textarea */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              className={`absolute right-2 top-2 h-9 w-9 rounded-lg ${isListening ? 'bg-red-500/20 text-red-500' : 'hover:bg-primary/10'}`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="h-[60px] w-14 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-muted-foreground hover:text-destructive text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Borrar historial
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

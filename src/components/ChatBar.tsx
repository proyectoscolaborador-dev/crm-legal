import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  User, 
  Send, 
  Loader2, 
  ChevronUp,
  ChevronDown,
  Zap,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [mode, setMode] = useState<AssistantMode>('operate');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isExpanded]);

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
        facturas: works.slice(0, 10).map(w => ({
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
    const messageToSend = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const context = buildContext();
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('assistant', {
        body: {
          mode,
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
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-card via-card to-card/95 border-t-2 border-primary/20 shadow-2xl">
      {/* Expanded Chat Area */}
      {isExpanded && (
        <div className="h-[350px] border-b border-primary/10 bg-gradient-to-b from-background/50 to-background">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto p-4 scroll-smooth"
          >
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    ¡Hola! Soy tu Copiloto IA
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {mode === 'read' 
                      ? 'Pregúntame sobre tus clientes, presupuestos o trabajos' 
                      : 'Puedo crear clientes, citas, presupuestos y más. ¡Solo pídelo!'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <button 
                      onClick={() => setInput('¿Cuántos clientes tengo?')}
                      className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors"
                    >
                      ¿Cuántos clientes tengo?
                    </button>
                    <button 
                      onClick={() => setInput('Crea un recordatorio para mañana')}
                      className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors"
                    >
                      Crear recordatorio
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-foreground text-background'
                          : 'bg-gradient-to-br from-primary to-secondary text-primary-foreground'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
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
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                            <ReactMarkdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</ReactMarkdown>
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
                                  ? 'bg-green-500/15 text-green-600 dark:text-green-400' 
                                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
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
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-card border border-border shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">Pensando...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll anchor */}
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
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-muted/80 rounded-xl px-3 py-2 flex-shrink-0">
            <Eye className={`w-4 h-4 transition-colors ${mode === 'read' ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              checked={mode === 'operate'}
              onCheckedChange={(checked) => setMode(checked ? 'operate' : 'read')}
              className="scale-90"
            />
            <Zap className={`w-4 h-4 transition-colors ${mode === 'operate' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>

          {/* Input */}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'read' ? 'Pregunta sobre tu CRM...' : 'Pide una acción: crear cliente, recordatorio...'}
            className="flex-1 h-10 rounded-xl border-primary/20 focus:border-primary/40 bg-background/50"
            disabled={isLoading}
          />

          {/* Send Button */}
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
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
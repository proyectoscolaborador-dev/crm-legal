import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

const CHAT_STORAGE_KEY = 'chatbar-messages';

export function ChatBar() {
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
  const [mode, setMode] = useState<AssistantMode>('read');
  
  useEffect(() => {
    if (!user && mode === 'operate') {
      setMode('read');
    }
  }, [user, mode]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const buildContext = useCallback(() => {
    return {
      currentUser: user ? { id: user.id, email: user.email } : undefined,
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
      const context = buildContext();
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

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
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg">
      {/* Expanded Chat Area */}
      {isExpanded && (
        <div className="h-[300px] border-b border-border">
          <ScrollArea className="h-full p-3" ref={scrollRef}>
            <div className="space-y-3 max-w-4xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
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
                    className={`flex gap-2 max-w-[80%] ${
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
                  <div className="flex gap-2 max-w-[80%]">
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
        </div>
      )}

      {/* Input Bar - Always visible */}
      <div className="p-3 bg-card">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>

          {/* Bot Icon */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>

          {/* Mode Toggle */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-2 py-1 flex-shrink-0">
              <Eye className={`w-3.5 h-3.5 ${mode === 'read' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                checked={mode === 'operate'}
                onCheckedChange={(checked) => setMode(checked ? 'operate' : 'read')}
                className="scale-75"
              />
              <Zap className={`w-3.5 h-3.5 ${mode === 'operate' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          ) : (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              Solo lectura
            </Badge>
          )}

          {/* Input */}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'read' ? 'Pregunta a tu Copiloto Mistral AI...' : 'Pide una acción...'}
            className="flex-1 h-10"
            disabled={isLoading}
          />

          {/* Send Button */}
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

          {/* Clear History */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

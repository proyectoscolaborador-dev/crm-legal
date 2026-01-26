import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotoChatProps {
  className?: string;
}

// Local storage key for conversation memory
const CHAT_STORAGE_KEY = 'copiloto_chat_history';

export function CopilotoChat({ className = '' }: CopilotoChatProps) {
  const { user } = useAuth();
  const { createReminder } = useReminders();
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on init
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
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
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const buildSystemInstructions = useCallback(async () => {
    if (!user) return '';

    try {
      const [clientsRes, worksRes, remindersRes, presupuestosRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('works').select('*, client:clients(name, company)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_completed', false).order('reminder_date', { ascending: true }).limit(10),
        supabase.from('presupuestos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);

      const clients = clientsRes.data || [];
      const works = worksRes.data || [];
      const reminders = remindersRes.data || [];
      const presupuestos = presupuestosRes.data || [];

      // Calculate pending amounts
      const totalPendiente = works
        .filter(w => w.status !== 'cobrado')
        .reduce((sum, w) => sum + (Number(w.amount) - Number(w.advance_payments)), 0);

      const today = new Date().toISOString().split('T')[0];

      return `Eres el Copiloto de un CRM para profesionales. IMPORTANTE: Responde SIEMPRE de forma MUY BREVE y directa (1-3 frases máximo), a menos que el usuario pida explícitamente más detalle.

Fecha de hoy: ${today}

CAPACIDADES ESPECIALES - Puedes ejecutar acciones:
- Crear recordatorios: Si el usuario pide recordar algo, agendar cita, etc., responde con el formato especial: [CREAR_RECORDATORIO: título | fecha YYYY-MM-DD | descripción opcional]
- Por ejemplo: "Recuérdame llamar a Juan mañana" → [CREAR_RECORDATORIO: Llamar a Juan | 2024-01-27 | Seguimiento cliente]

DATOS DEL CRM:
📋 Clientes (${clients.length}): ${clients.slice(0, 5).map(c => c.name).join(', ') || 'Ninguno'}
🔨 Trabajos activos (${works.length}): ${works.slice(0, 3).map(w => `${w.title} (${w.status})`).join(', ') || 'Ninguno'}
💰 Pendiente de cobro: ${totalPendiente.toFixed(0)}€
📅 Recordatorios pendientes (${reminders.length}): ${reminders.slice(0, 3).map(r => `${r.title} (${r.reminder_date})`).join(', ') || 'Ninguno'}
📄 Presupuestos (${presupuestos.length}): ${presupuestos.slice(0, 3).map(p => `${p.numero_presupuesto}: ${p.total_presupuesto}€`).join(', ') || 'Ninguno'}

Responde en español, sé conciso y útil.`;
    } catch (error) {
      console.error('Error building context:', error);
      return 'Eres el Copiloto de un CRM. Responde de forma breve y directa.';
    }
  }, [user]);

  const processAssistantResponse = useCallback(async (response: string): Promise<string> => {
    // Check for reminder creation command
    const reminderMatch = response.match(/\[CREAR_RECORDATORIO:\s*([^|]+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*(?:\|\s*([^\]]*))?\]/);
    
    if (reminderMatch) {
      const [fullMatch, title, date, description] = reminderMatch;
      try {
        await createReminder.mutateAsync({
          title: title.trim(),
          reminder_date: date,
          description: description?.trim() || null,
          reminder_type: 'general',
        });
        toast.success(`Recordatorio creado: ${title.trim()}`);
        // Remove the command from the response and add confirmation
        return response.replace(fullMatch, `✅ Recordatorio "${title.trim()}" creado para el ${date}`);
      } catch (error) {
        console.error('Error creating reminder:', error);
        return response.replace(fullMatch, `❌ No pude crear el recordatorio. ${error instanceof Error ? error.message : ''}`);
      }
    }
    
    return response;
  }, [createReminder]);

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
      const instrucciones_sistema = await buildSystemInstructions();

      // Build conversation history for context (last 10 messages)
      const recentHistory = messages.slice(-10).map(m => 
        `${m.role === 'user' ? 'Usuario' : 'Copiloto'}: ${m.content}`
      ).join('\n');

      const fullMessage = recentHistory 
        ? `Historial reciente:\n${recentHistory}\n\nNuevo mensaje del usuario: ${messageToSend}`
        : messageToSend;

      const { data, error } = await supabase.functions.invoke('gemini-api', {
        body: { 
          instrucciones_sistema,
          mensaje_usuario: fullMessage
        }
      });

      if (error) {
        const maybeBody = (error as any)?.context?.body;
        if (typeof maybeBody === 'string' && maybeBody.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(maybeBody);
            throw new Error(parsed?.error || error.message);
          } catch {
            // fallback
          }
        }
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Process the response for any actions
      const processedResponse = await processAssistantResponse(data?.response || 'Lo siento, no pude procesar tu solicitud.');

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: processedResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error calling Gemini:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${msg}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center ${className}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-50 bg-card border border-border shadow-2xl transition-all duration-300 ${
        isExpanded 
          ? 'inset-4 rounded-2xl' 
          : 'bottom-20 md:bottom-6 right-4 w-[calc(100%-2rem)] md:w-96 h-[500px] max-h-[70vh] rounded-2xl'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Copiloto</h3>
            <p className="text-xs text-muted-foreground">Asistente CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearHistory}
              className="text-xs text-muted-foreground h-8"
            >
              Limpiar
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 h-[calc(100%-8rem)]" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ¿En qué puedo ayudarte?
              </p>
              <div className="space-y-2">
                {[
                  '¿Cuánto tengo pendiente?',
                  'Recuérdame llamar mañana a...',
                  '¿Qué trabajos tengo activos?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="block w-full px-3 py-2 text-xs text-left rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors"
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
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-foreground text-background rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm px-3 py-2 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Pensando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card rounded-b-2xl">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-muted border-0 focus-visible:ring-1 h-10 text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

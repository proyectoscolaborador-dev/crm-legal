import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Loader2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CopilotoCRM() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const buildSystemInstructions = async () => {
    if (!user) return '';

    try {
      // Fetch recent data from all CRM tables
      const [clientsRes, worksRes, remindersRes, presupuestosRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('works').select('*, client:clients(name, company)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_completed', false).order('reminder_date', { ascending: true }).limit(5),
        supabase.from('presupuestos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const clients = clientsRes.data || [];
      const works = worksRes.data || [];
      const reminders = remindersRes.data || [];
      const presupuestos = presupuestosRes.data || [];

      // Build context string
      let context = `Eres el asistente de Copiloto CRM, un sistema de gestión de trabajos y presupuestos para profesionales.
Tienes acceso a los siguientes datos del usuario:

=== CLIENTES (${clients.length} recientes) ===
${clients.map(c => `- ${c.name}${c.company ? ` (${c.company})` : ''} | Tel: ${c.phone || 'N/A'} | Email: ${c.email || 'N/A'}`).join('\n') || 'Sin clientes'}

=== TRABAJOS/OBRAS (${works.length} recientes) ===
${works.map(w => `- "${w.title}" | Cliente: ${(w as any).client?.name || 'N/A'} | Estado: ${w.status} | Importe: ${w.amount}€ | Anticipos: ${w.advance_payments}€`).join('\n') || 'Sin trabajos'}

=== RECORDATORIOS PENDIENTES (${reminders.length}) ===
${reminders.map(r => `- ${r.title} | Fecha: ${r.reminder_date} | Tipo: ${r.reminder_type}`).join('\n') || 'Sin recordatorios'}

=== PRESUPUESTOS (${presupuestos.length} recientes) ===
${presupuestos.map(p => `- Nº ${p.numero_presupuesto} | ${p.cliente_nombre} | "${p.obra_titulo}" | Total: ${p.total_presupuesto}€ | Estado: ${p.estado_presupuesto}`).join('\n') || 'Sin presupuestos'}

Responde en español, de forma clara y profesional. Ayuda al usuario con consultas sobre sus datos, análisis financieros, recordatorios, y consejos de gestión.`;

      return context;
    } catch (error) {
      console.error('Error building context:', error);
      return 'Eres el asistente de Copiloto CRM. Ayuda al usuario con sus consultas.';
    }
  };

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

      const { data, error } = await supabase.functions.invoke('gemini-api', {
        body: { 
          instrucciones_sistema,
          mensaje_usuario: messageToSend
        }
      });

      // Supabase devuelve errores HTTP aquí; además, nuestra función puede responder { error, details }
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

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data?.response || 'Lo siento, no pude procesar tu solicitud.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error calling Gemini:', error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Lo siento, hubo un error al procesar tu solicitud: ${msg}`,
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="transition-transform active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Copiloto del CRM</h1>
            <p className="text-xs text-muted-foreground">Habla con tus datos</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span>Mistral AI</span>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="container max-w-3xl mx-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    ¡Hola! Soy tu Copiloto
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Puedo ayudarte a consultar tus clientes, trabajos, presupuestos y recordatorios. 
                    También puedo darte análisis financieros y consejos de gestión.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {[
                    '¿Cuánto tengo pendiente de cobrar?',
                    '¿Qué recordatorios tengo para esta semana?',
                    'Resume mis últimos trabajos',
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
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-foreground text-background rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                      <span className="text-sm text-muted-foreground">Pensando...</span>
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
              placeholder="Escribe tu mensaje..."
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
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, Mic, MicOff, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotoChatProps {
  className?: string;
}

const CHAT_STORAGE_KEY = 'copiloto_chat_history';

export function CopilotoChat({ className = '' }: CopilotoChatProps) {
  const { user } = useAuth();
  const { createReminder } = useReminders();
  const [messages, setMessages] = useState<Message[]>(() => {
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Setup speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Error con el micrófono');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta entrada por voz');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

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

      const totalPendiente = works
        .filter(w => w.status !== 'cobrado')
        .reduce((sum, w) => sum + (Number(w.amount) - Number(w.advance_payments)), 0);

      const today = new Date().toISOString().split('T')[0];

      return `Eres Copiloto, asistente de CRM. REGLA FUNDAMENTAL: Responde en MÁXIMO 1-2 frases cortas. Sin listas. Sin explicaciones largas. Sé directo como un mensaje de WhatsApp.

Fecha: ${today}

ACCIONES:
- Crear recordatorio: [CREAR_RECORDATORIO: título | YYYY-MM-DD | descripción]

DATOS:
- Clientes: ${clients.slice(0, 5).map(c => c.name).join(', ') || 'Ninguno'}
- Trabajos: ${works.slice(0, 3).map(w => w.title).join(', ') || 'Ninguno'}
- Pendiente cobro: ${totalPendiente.toFixed(0)}€
- Recordatorios: ${reminders.length}

Responde BREVE. Solo 1-2 frases.`;
    } catch (error) {
      console.error('Error building context:', error);
      return 'Eres Copiloto. Responde en 1-2 frases máximo.';
    }
  }, [user]);

  const processAssistantResponse = useCallback(async (response: string): Promise<string> => {
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
        toast.success(`Recordatorio: ${title.trim()}`);
        return response.replace(fullMatch, `✅ Listo, te recuerdo "${title.trim()}" el ${date}`);
      } catch (error) {
        return response.replace(fullMatch, `❌ No pude crear el recordatorio`);
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
    setIsExpanded(true);

    try {
      const instrucciones_sistema = await buildSystemInstructions();

      const recentHistory = messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'Tú' : 'Copiloto'}: ${m.content}`
      ).join('\n');

      const fullMessage = recentHistory 
        ? `${recentHistory}\nTú: ${messageToSend}`
        : messageToSend;

      const { data, error } = await supabase.functions.invoke('gemini-api', {
        body: { 
          instrucciones_sistema,
          mensaje_usuario: fullMessage
        }
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const processedResponse = await processAssistantResponse(data?.response || 'Error');

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: processedResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error.message || 'desconocido'}`,
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
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 md:bottom-4 md:left-4 md:right-4 ${className}`}>
      <div className="mx-auto max-w-4xl">
        {/* Chat Container */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden">
          
          {/* Messages Area - Expandable */}
          {isExpanded && messages.length > 0 && (
            <div className="border-b border-border">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Copiloto</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={clearHistory}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                    className="h-7 w-7"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-64 md:h-80" ref={scrollRef}>
                <div className="p-4 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>p]:m-0">
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
                      <div className="rounded-2xl px-4 py-2 bg-muted">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Input Bar - Always Visible */}
          <div className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              {/* Expand Button */}
              {messages.length > 0 && !isExpanded && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsExpanded(true)}
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                >
                  <ChevronUp className="w-5 h-5" />
                </Button>
              )}

              {/* Voice Input Button */}
              <Button
                variant={isListening ? "default" : "ghost"}
                size="icon"
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`h-10 w-10 shrink-0 transition-all ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* Input Field */}
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => messages.length > 0 && setIsExpanded(true)}
                  placeholder={isListening ? "Escuchando..." : "Pregunta algo a tu Copiloto..."}
                  className="w-full bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-10 md:h-11 text-sm pr-12"
                  disabled={isLoading || isListening}
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-10 w-10 shrink-0"
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
      </div>
    </div>
  );
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for the assistant
const tools = [
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "Crea un recordatorio en la agenda del usuario. Usa esta función cuando el usuario quiera recordar algo: enviar presupuesto, solicitar cobro, visitas, llamadas, cualquier tarea futura.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Título breve del recordatorio (ej: 'Enviar presupuesto a Juan', 'Llamar a cliente')"
          },
          description: {
            type: "string",
            description: "Descripción detallada opcional"
          },
          reminder_date: {
            type: "string",
            description: "Fecha del recordatorio en formato YYYY-MM-DD"
          },
          reminder_time: {
            type: "string",
            description: "Hora del recordatorio en formato HH:MM (opcional)"
          },
          reminder_type: {
            type: "string",
            enum: ["enviar_presupuesto", "solicitar_cobro", "visita", "llamada", "general"],
            description: "Tipo de recordatorio"
          }
        },
        required: ["title", "reminder_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_reminders",
      description: "Lista los recordatorios pendientes del usuario",
      parameters: {
        type: "object",
        properties: {
          include_completed: {
            type: "boolean",
            description: "Incluir recordatorios completados"
          }
        }
      }
    }
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history, userId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build messages array with system prompt and history
    const todayDate = new Date().toISOString().split('T')[0];
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente virtual para "Copiloto", una aplicación de gestión de trabajos y presupuestos para profesionales autónomos y pequeñas empresas en España.

La fecha de hoy es: ${todayDate}

Tu objetivo es ayudar a los usuarios con:
- Crear recordatorios en la agenda (enviar presupuestos, solicitar cobros, visitas, llamadas, etc.)
- Consultas sobre cómo usar la aplicación
- Consejos de gestión empresarial
- Ayuda con la creación de presupuestos
- Recomendaciones para mejorar su flujo de trabajo
- Resolución de dudas sobre facturación

IMPORTANTE SOBRE RECORDATORIOS:
- Cuando el usuario quiera recordar algo, usa la función create_reminder
- Si el usuario dice "mañana", calcula la fecha correcta
- Si dice "la semana que viene", calcula 7 días desde hoy
- Si no especifica fecha, pregunta cuándo quiere el recordatorio
- Ejemplos: "Recuérdame enviar el presupuesto a Juan mañana" → crea recordatorio
- "Apunta una visita para el viernes" → crea recordatorio tipo visita

Responde siempre en español, de forma amable y profesional. Sé conciso pero útil.`
      },
      ...(history || []),
      { role: 'user', content: message }
    ];

    // First call - may include tool calls
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    // Check if there are tool calls
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolResults = [];
      const remindersCreated = [];
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        if (functionName === 'create_reminder' && userId) {
          // Create reminder in database
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            const { data: reminder, error } = await supabase
              .from('reminders')
              .insert({
                user_id: userId,
                title: args.title,
                description: args.description || null,
                reminder_date: args.reminder_date,
                reminder_time: args.reminder_time || null,
                reminder_type: args.reminder_type || 'general',
              })
              .select()
              .single();
            
            if (error) {
              console.error('Error creating reminder:', error);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ success: false, error: error.message })
              });
            } else {
              remindersCreated.push(reminder);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ 
                  success: true, 
                  message: `Recordatorio "${args.title}" creado para el ${args.reminder_date}` 
                })
              });
            }
          }
        } else if (functionName === 'list_reminders' && userId) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            let query = supabase
              .from('reminders')
              .select('*')
              .eq('user_id', userId)
              .order('reminder_date', { ascending: true });
            
            if (!args.include_completed) {
              query = query.eq('is_completed', false);
            }
            
            const { data: reminders, error } = await query.limit(10);
            
            if (error) {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ success: false, error: error.message })
              });
            } else {
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                content: JSON.stringify({ 
                  success: true, 
                  reminders: reminders.map(r => ({
                    title: r.title,
                    date: r.reminder_date,
                    type: r.reminder_type,
                    completed: r.is_completed
                  }))
                })
              });
            }
          }
        }
      }
      
      // Second call with tool results
      const followUpMessages = [
        ...messages,
        choice.message,
        ...toolResults
      ];
      
      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: followUpMessages,
          max_tokens: 500,
        }),
      });
      
      if (!followUpResponse.ok) {
        throw new Error('Follow-up AI call failed');
      }
      
      const followUpData = await followUpResponse.json();
      const finalResponse = followUpData.choices?.[0]?.message?.content || '¡Listo! He apuntado el recordatorio en tu agenda.';
      
      return new Response(
        JSON.stringify({ 
          response: finalResponse,
          remindersCreated: remindersCreated.length > 0 ? remindersCreated : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // No tool calls, return direct response
    const assistantResponse = choice?.message?.content || 'Lo siento, no pude generar una respuesta.';

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in gemini-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

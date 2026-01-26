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
            description: "Título breve del recordatorio"
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
      description: "Lista los recordatorios del usuario. Usa esta función cuando pregunte por sus recordatorios, agenda o tareas pendientes.",
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
  },
  {
    type: "function",
    function: {
      name: "delete_reminder",
      description: "Elimina o anula un recordatorio de la agenda. Usa esta función cuando el usuario quiera quitar, eliminar, anular o cancelar un recordatorio.",
      parameters: {
        type: "object",
        properties: {
          reminder_title: {
            type: "string",
            description: "Título o parte del título del recordatorio a eliminar"
          }
        },
        required: ["reminder_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_reminder",
      description: "Marca un recordatorio como completado. Usa cuando el usuario diga que ya hizo algo o quiera marcar como hecho.",
      parameters: {
        type: "object",
        properties: {
          reminder_title: {
            type: "string",
            description: "Título o parte del título del recordatorio a completar"
          }
        },
        required: ["reminder_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_works_summary",
      description: "Obtiene un resumen de los trabajos del usuario. Usa cuando pregunte por sus trabajos, proyectos, presupuestos pendientes, cobros, etc.",
      parameters: {
        type: "object",
        properties: {
          status_filter: {
            type: "string",
            enum: ["todos", "nuevos", "enviados", "en_obra", "pendiente_facturar", "facturado", "cobrado"],
            description: "Filtrar por estado del trabajo"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_clients_info",
      description: "Obtiene información sobre los clientes del usuario. Usa cuando pregunte por clientes, sus datos, teléfonos, emails, etc.",
      parameters: {
        type: "object",
        properties: {
          search_name: {
            type: "string",
            description: "Nombre del cliente a buscar (opcional)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Obtiene resumen financiero: totales facturados, cobrados, pendientes, anticipos. Usa cuando pregunte por dinero, facturación, cobros, o estadísticas.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_work_by_client",
      description: "Busca trabajos de un cliente específico. Usa cuando pregunte por los trabajos de un cliente en particular.",
      parameters: {
        type: "object",
        properties: {
          client_name: {
            type: "string",
            description: "Nombre del cliente a buscar"
          }
        },
        required: ["client_name"]
      }
    }
  }
];

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    // Build messages array with system prompt and history
    const todayDate = new Date().toISOString().split('T')[0];
    const messages = [
      {
        role: 'system',
        content: `Eres un asistente virtual súper inteligente para "Copiloto", una aplicación de gestión de trabajos y presupuestos para profesionales autónomos y pequeñas empresas en España.

La fecha de hoy es: ${todayDate}

TIENES ACCESO COMPLETO a los datos del usuario y puedes ayudarle con TODO:

📅 AGENDA Y RECORDATORIOS:
- Crear nuevos recordatorios (enviar presupuestos, cobrar, visitas, llamadas...)
- Listar recordatorios pendientes
- Eliminar/anular recordatorios
- Marcar recordatorios como completados
- Cuando digan "mañana" = fecha de mañana, "la semana que viene" = +7 días, etc.

💼 TRABAJOS Y PROYECTOS:
- Ver resumen de trabajos por estado (nuevos, enviados, en obra, facturados, cobrados)
- Buscar trabajos de un cliente específico
- Informar sobre trabajos pendientes de acción

👥 CLIENTES:
- Buscar información de clientes
- Mostrar teléfonos y emails
- Listar clientes

💰 FINANZAS:
- Mostrar totales facturados y cobrados
- Informar sobre presupuestos pendientes
- Ver anticipos recibidos
- Calcular pendientes de cobro

🎯 CONSEJOS Y AYUDA:
- Consejos de gestión empresarial
- Ayuda con presupuestos
- Recomendaciones para mejorar flujo de trabajo
- Resolución de dudas sobre facturación
- Cómo usar la aplicación

IMPORTANTE:
- USA LAS FUNCIONES disponibles para obtener datos reales
- Sé proactivo: si preguntan por trabajos, usa get_works_summary
- Si preguntan por clientes, usa get_clients_info
- Si preguntan por dinero/facturación, usa get_financial_summary
- Responde siempre en español, amable y profesional
- Sé conciso pero completo`
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
        max_tokens: 1200,
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
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0 && supabase && userId) {
      const toolResults = [];
      let remindersCreated = false;
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        if (functionName === 'create_reminder') {
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
          
          remindersCreated = !error;
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(error 
              ? { success: false, error: error.message }
              : { success: true, message: `Recordatorio "${args.title}" creado para el ${args.reminder_date}` }
            )
          });
        } 
        else if (functionName === 'list_reminders') {
          let query = supabase
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .order('reminder_date', { ascending: true });
          
          if (!args.include_completed) {
            query = query.eq('is_completed', false);
          }
          
          const { data: reminders, error } = await query.limit(15);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(error 
              ? { success: false, error: error.message }
              : { 
                  success: true, 
                  total: reminders?.length || 0,
                  reminders: reminders?.map(r => ({
                    id: r.id,
                    title: r.title,
                    date: r.reminder_date,
                    time: r.reminder_time,
                    type: r.reminder_type,
                    completed: r.is_completed,
                    description: r.description
                  }))
                }
            )
          });
        }
        else if (functionName === 'delete_reminder') {
          // Find reminder by title (partial match)
          const { data: reminders } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', `%${args.reminder_title}%`)
            .limit(1);
          
          if (reminders && reminders.length > 0) {
            const { error } = await supabase
              .from('reminders')
              .delete()
              .eq('id', reminders[0].id);
            
            remindersCreated = !error;
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify(error 
                ? { success: false, error: error.message }
                : { success: true, message: `Recordatorio "${reminders[0].title}" eliminado` }
              )
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ success: false, error: 'No encontré ningún recordatorio con ese título' })
            });
          }
        }
        else if (functionName === 'complete_reminder') {
          const { data: reminders } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .eq('is_completed', false)
            .ilike('title', `%${args.reminder_title}%`)
            .limit(1);
          
          if (reminders && reminders.length > 0) {
            const { error } = await supabase
              .from('reminders')
              .update({ is_completed: true })
              .eq('id', reminders[0].id);
            
            remindersCreated = !error;
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify(error 
                ? { success: false, error: error.message }
                : { success: true, message: `Recordatorio "${reminders[0].title}" marcado como completado` }
              )
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ success: false, error: 'No encontré ningún recordatorio pendiente con ese título' })
            });
          }
        }
        else if (functionName === 'get_works_summary') {
          let query = supabase
            .from('works')
            .select('*, client:clients(name, company)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          // Apply status filter
          if (args.status_filter && args.status_filter !== 'todos') {
            const statusMap: Record<string, string> = {
              'nuevos': 'presupuesto_solicitado',
              'enviados': 'presupuesto_enviado',
              'en_obra': 'presupuesto_aceptado',
              'pendiente_facturar': 'pendiente_facturar',
              'facturado': 'factura_enviada',
              'cobrado': 'cobrado'
            };
            const status = statusMap[args.status_filter];
            if (status) query = query.eq('status', status);
          }
          
          const { data: works, error } = await query.limit(20);
          
          const statusLabels: Record<string, string> = {
            'presupuesto_solicitado': 'Nuevo',
            'presupuesto_enviado': 'Enviado',
            'presupuesto_aceptado': 'En obra',
            'pendiente_facturar': 'Pendiente facturar',
            'factura_enviada': 'Facturado',
            'cobrado': 'Cobrado'
          };
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(error 
              ? { success: false, error: error.message }
              : { 
                  success: true,
                  total: works?.length || 0,
                  works: works?.map(w => ({
                    title: w.title,
                    client: w.client?.company || w.client?.name || 'Sin cliente',
                    amount: w.amount,
                    status: statusLabels[w.status] || w.status,
                    advance_payments: w.advance_payments || 0,
                    is_paid: w.is_paid
                  }))
                }
            )
          });
        }
        else if (functionName === 'get_clients_info') {
          let query = supabase
            .from('clients')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });
          
          if (args.search_name) {
            query = query.or(`name.ilike.%${args.search_name}%,company.ilike.%${args.search_name}%`);
          }
          
          const { data: clients, error } = await query.limit(15);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(error 
              ? { success: false, error: error.message }
              : { 
                  success: true,
                  total: clients?.length || 0,
                  clients: clients?.map(c => ({
                    name: c.name,
                    company: c.company,
                    phone: c.phone,
                    email: c.email,
                    city: c.city
                  }))
                }
            )
          });
        }
        else if (functionName === 'get_financial_summary') {
          const { data: works, error } = await supabase
            .from('works')
            .select('amount, advance_payments, is_paid, status')
            .eq('user_id', userId);
          
          if (error) {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ success: false, error: error.message })
            });
          } else {
            const presupuestosEnviados = works?.filter(w => w.status === 'presupuesto_enviado')
              .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
            const enObra = works?.filter(w => w.status === 'presupuesto_aceptado')
              .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
            const pendienteFacturar = works?.filter(w => w.status === 'pendiente_facturar')
              .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
            const facturado = works?.filter(w => w.status === 'factura_enviada')
              .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
            const cobrado = works?.filter(w => w.is_paid || w.status === 'cobrado')
              .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
            const totalAnticipos = works?.reduce((sum, w) => sum + Number(w.advance_payments || 0), 0) || 0;
            const pendienteCobro = works?.filter(w => w.status === 'factura_enviada' && !w.is_paid)
              .reduce((sum, w) => sum + Number(w.amount) - Number(w.advance_payments || 0), 0) || 0;
            
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({
                success: true,
                summary: {
                  presupuestos_enviados: presupuestosEnviados,
                  en_obra: enObra,
                  pendiente_facturar: pendienteFacturar,
                  facturado_pendiente_cobro: pendienteCobro,
                  total_cobrado: cobrado,
                  anticipos_recibidos: totalAnticipos,
                  total_trabajos: works?.length || 0
                }
              })
            });
          }
        }
        else if (functionName === 'search_work_by_client') {
          // First find clients matching the name
          const { data: clients } = await supabase
            .from('clients')
            .select('id, name, company')
            .eq('user_id', userId)
            .or(`name.ilike.%${args.client_name}%,company.ilike.%${args.client_name}%`);
          
          if (clients && clients.length > 0) {
            const clientIds = clients.map(c => c.id);
            const { data: works, error } = await supabase
              .from('works')
              .select('*')
              .eq('user_id', userId)
              .in('client_id', clientIds)
              .order('created_at', { ascending: false })
              .limit(10);
            
            const statusLabels: Record<string, string> = {
              'presupuesto_solicitado': 'Nuevo',
              'presupuesto_enviado': 'Enviado',
              'presupuesto_aceptado': 'En obra',
              'pendiente_facturar': 'Pendiente facturar',
              'factura_enviada': 'Facturado',
              'cobrado': 'Cobrado'
            };
            
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify(error 
                ? { success: false, error: error.message }
                : { 
                    success: true,
                    client: clients[0].company || clients[0].name,
                    total: works?.length || 0,
                    works: works?.map(w => ({
                      title: w.title,
                      amount: w.amount,
                      status: statusLabels[w.status] || w.status,
                      is_paid: w.is_paid
                    }))
                  }
              )
            });
          } else {
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              content: JSON.stringify({ success: false, error: `No encontré ningún cliente con el nombre "${args.client_name}"` })
            });
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
          max_tokens: 800,
        }),
      });
      
      if (!followUpResponse.ok) {
        throw new Error('Follow-up AI call failed');
      }
      
      const followUpData = await followUpResponse.json();
      const finalResponse = followUpData.choices?.[0]?.message?.content || '¡Listo!';
      
      return new Response(
        JSON.stringify({ 
          response: finalResponse,
          remindersCreated: remindersCreated
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

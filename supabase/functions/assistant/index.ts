import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Action {
  type: 'update_record' | 'create_record' | 'delete_record';
  entity: 'cliente' | 'cita' | 'presupuesto' | 'factura';
  id?: string;
  data?: Record<string, unknown>;
}

interface AssistantRequest {
  mode: 'read' | 'operate';
  messages: Message[];
  context: {
    currentUser?: { id: string; email?: string };
    currentRoute?: string;
    selectedRecord?: Record<string, unknown>;
    lastRecords?: {
      clientes?: unknown[];
      citas?: unknown[];
      presupuestos?: unknown[];
      facturas?: unknown[];
    };
  };
}

interface MistralResponse {
  reply: string;
  actions?: Action[];
}

// Map entity names to table names
const entityToTable: Record<string, string> = {
  cliente: 'clients',
  cita: 'reminders',
  presupuesto: 'presupuestos',
  factura: 'works',
};

// Build system prompt for Mistral
function buildSystemPrompt(mode: 'read' | 'operate', context: AssistantRequest['context']): string {
  const today = new Date().toISOString().split('T')[0];
  
  let contextInfo = `Fecha actual: ${today}\n\n`;
  
  if (context.lastRecords) {
    const { clientes, citas, presupuestos, facturas } = context.lastRecords;
    
    if (clientes && clientes.length > 0) {
      contextInfo += `=== CLIENTES RECIENTES (${clientes.length}) ===\n`;
      contextInfo += JSON.stringify(clientes.slice(0, 5), null, 2) + '\n\n';
    }
    
    if (citas && citas.length > 0) {
      contextInfo += `=== CITAS/RECORDATORIOS (${citas.length}) ===\n`;
      contextInfo += JSON.stringify(citas.slice(0, 5), null, 2) + '\n\n';
    }
    
    if (presupuestos && presupuestos.length > 0) {
      contextInfo += `=== PRESUPUESTOS (${presupuestos.length}) ===\n`;
      contextInfo += JSON.stringify(presupuestos.slice(0, 5), null, 2) + '\n\n';
    }
    
    if (facturas && facturas.length > 0) {
      contextInfo += `=== TRABAJOS/FACTURAS (${facturas.length}) ===\n`;
      contextInfo += JSON.stringify(facturas.slice(0, 5), null, 2) + '\n\n';
    }
  }
  
  if (context.selectedRecord) {
    contextInfo += `=== REGISTRO SELECCIONADO ===\n`;
    contextInfo += JSON.stringify(context.selectedRecord, null, 2) + '\n\n';
  }

  const basePrompt = `Eres un asistente inteligente para un CRM de gestión de trabajos y presupuestos.
Tu nombre es "Copiloto". Responde siempre en español de forma concisa y profesional.

${contextInfo}

IMPORTANTE: Siempre responde en formato JSON válido con la siguiente estructura:
{
  "reply": "tu respuesta al usuario",
  "actions": [] 
}`;

  if (mode === 'read') {
    return basePrompt + `

MODO LECTURA: Solo puedes responder consultas. El array "actions" debe estar vacío.
Ayuda al usuario con:
- Consultas sobre clientes, presupuestos, trabajos y citas
- Análisis financieros y estadísticas
- Resúmenes y recomendaciones`;
  }

  return basePrompt + `

MODO OPERACIÓN: Puedes ejecutar acciones sobre el CRM.

ACCIONES DISPONIBLES:
- update_record: Actualizar un registro existente
- create_record: Crear un nuevo registro
- delete_record: Eliminar un registro

ENTIDADES:
- cliente: Clientes del CRM
- cita: Recordatorios y citas
- presupuesto: Presupuestos
- factura: Trabajos y facturas

Formato de acciones:
{
  "type": "create_record" | "update_record" | "delete_record",
  "entity": "cliente" | "cita" | "presupuesto" | "factura",
  "id": "uuid del registro (solo para update/delete)",
  "data": { campos a crear/actualizar }
}

CAMPOS POR ENTIDAD:
- cliente: name, email, phone, company, address, city, province, postal_code, nif, notes
- cita: title, description, reminder_date (YYYY-MM-DD), reminder_time (HH:MM), reminder_type (general/llamada/reunion/pago/entrega)
- presupuesto: cliente_nombre, obra_titulo, total_presupuesto, estado_presupuesto
- factura: title, amount, status, description

Ejemplo de respuesta con acción:
{
  "reply": "He creado el recordatorio para llamar al cliente mañana.",
  "actions": [
    {
      "type": "create_record",
      "entity": "cita",
      "data": {
        "title": "Llamar a cliente",
        "reminder_date": "2024-01-15",
        "reminder_type": "llamada"
      }
    }
  ]
}`;
}

// Call AI API (uses Lovable AI Gateway with Mistral-compatible interface or direct Mistral)
async function callAI(messages: Message[], systemPrompt: string): Promise<MistralResponse> {
  // Try Mistral first, fallback to Lovable AI Gateway
  const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const aiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  let response: Response;
  let usingLovable = false;

  // Try Mistral API first if key is available
  if (MISTRAL_API_KEY) {
    console.log('Trying Mistral API...');
    response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: aiMessages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (response.ok) {
      console.log('Mistral API responded successfully');
    } else {
      console.log('Mistral API failed, falling back to Lovable AI Gateway');
      usingLovable = true;
    }
  } else {
    usingLovable = true;
  }

  // Fallback to Lovable AI Gateway
  if (usingLovable) {
    if (!LOVABLE_API_KEY) {
      throw new Error('No AI API key configured (MISTRAL_API_KEY or LOVABLE_API_KEY)');
    }
    
    console.log('Using Lovable AI Gateway...');
    // Lovable AI Gateway doesn't support response_format, so we don't include it
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        temperature: 0.7,
      }),
    });
  }

  if (!response!.ok) {
    const errorText = await response!.text();
    console.error('AI API error:', response!.status, errorText);
    throw new Error(`AI API error: ${response!.status} - ${errorText}`);
  }

  const data = await response!.json();
  console.log('AI response:', JSON.stringify(data, null, 2));

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in AI response');
  }
  
  // Parse JSON response - handle both structured and plain text
  try {
    // Clean up the content in case it has markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();
    
    const parsed = JSON.parse(cleanContent) as MistralResponse;
    // Ensure reply is always a string
    if (typeof parsed.reply !== 'string') {
      parsed.reply = JSON.stringify(parsed.reply);
    }
    return parsed;
  } catch {
    // If JSON parse fails, return the content as reply
    return { reply: content, actions: [] };
  }
}

// Execute actions against the CRM
async function executeActions(
  actions: Action[],
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ action: Action; success: boolean; error?: string }[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const results: { action: Action; success: boolean; error?: string }[] = [];

  for (const action of actions) {
    const tableName = entityToTable[action.entity];
    if (!tableName) {
      results.push({ action, success: false, error: `Unknown entity: ${action.entity}` });
      continue;
    }

    try {
      if (action.type === 'create_record') {
        const insertData = { ...action.data, user_id: userId };
        const { error } = await supabase.from(tableName).insert(insertData);
        if (error) throw error;
        results.push({ action, success: true });
        console.log(`Created record in ${tableName}:`, insertData);
      } else if (action.type === 'update_record') {
        if (!action.id) throw new Error('ID required for update');
        const { error } = await supabase
          .from(tableName)
          .update(action.data)
          .eq('id', action.id)
          .eq('user_id', userId);
        if (error) throw error;
        results.push({ action, success: true });
        console.log(`Updated record ${action.id} in ${tableName}`);
      } else if (action.type === 'delete_record') {
        if (!action.id) throw new Error('ID required for delete');
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', action.id)
          .eq('user_id', userId);
        if (error) throw error;
        results.push({ action, success: true });
        console.log(`Deleted record ${action.id} from ${tableName}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ action, success: false, error: errorMessage });
      console.error(`Error executing action on ${tableName}:`, error);
    }
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, messages, context } = await req.json() as AssistantRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mode || !['read', 'operate'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'mode must be "read" or "operate"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For OPERATE mode, we MUST validate authentication since it modifies data
    let authenticatedUserId: string | null = null;
    
    if (mode === 'operate') {
      const authHeader = req.headers.get('Authorization');
      console.log('Auth header present:', !!authHeader);
      
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('Missing or invalid auth header format');
        return new Response(
          JSON.stringify({ error: 'Authentication required for operate mode' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      
      console.log('Supabase URL:', supabaseUrl ? 'present' : 'missing');
      console.log('Supabase Anon Key:', supabaseAnonKey ? 'present' : 'missing');
      
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      // Use getUser with the token directly
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
      
      console.log('getUser result - user:', !!user, 'error:', userError?.message);
      
      if (userError || !user) {
        console.log('Auth validation failed:', userError?.message || 'No user returned');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid token for operate mode', details: userError?.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      authenticatedUserId = user.id;
      console.log('Authenticated user ID:', authenticatedUserId);
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(mode, context || {});

    // Call AI (Mistral or Lovable AI Gateway)
    const aiResponse = await callAI(messages, systemPrompt);

    let executedActions: { action: Action; success: boolean; error?: string }[] = [];

    // Execute actions if in operate mode - use authenticated user ID for security
    if (mode === 'operate' && aiResponse.actions && aiResponse.actions.length > 0 && authenticatedUserId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      executedActions = await executeActions(
        aiResponse.actions,
        authenticatedUserId,
        supabaseUrl,
        supabaseKey
      );
    }

    return new Response(
      JSON.stringify({
        reply: aiResponse.reply,
        executedActions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

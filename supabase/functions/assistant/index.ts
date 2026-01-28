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
    stats?: {
      total_clientes?: number;
      total_trabajos?: number;
      total_presupuestos?: number;
      total_recordatorios?: number;
      recordatorios_pendientes?: number;
      trabajos_cobrados?: number;
      trabajos_pendientes?: number;
      importe_total_trabajos?: number;
      importe_cobrado?: number;
      importe_pendiente?: number;
      anticipos_recibidos?: number;
      pendiente_real?: number;
      presupuestos_borrador?: number;
      presupuestos_enviados?: number;
      presupuestos_aceptados?: number;
      valor_presupuestos?: number;
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
  
  // Añadir estadísticas resumen COMPLETAS (esto es lo más importante)
  if (context.stats) {
    const s = context.stats;
    contextInfo += `=== RESUMEN FINANCIERO DEL CRM ===
📊 TOTALES:
- Clientes: ${s.total_clientes || 0}
- Trabajos: ${s.total_trabajos || 0} (${s.trabajos_cobrados || 0} cobrados, ${s.trabajos_pendientes || 0} pendientes)
- Presupuestos: ${s.total_presupuestos || 0} (${s.presupuestos_borrador || 0} borrador, ${s.presupuestos_enviados || 0} enviados, ${s.presupuestos_aceptados || 0} aceptados)
- Recordatorios: ${s.total_recordatorios || 0} (${s.recordatorios_pendientes || 0} pendientes)

💰 IMPORTES:
- Total trabajos: ${s.importe_total_trabajos?.toLocaleString('es-ES')} €
- Cobrado: ${s.importe_cobrado?.toLocaleString('es-ES')} €
- Pendiente de cobro: ${s.importe_pendiente?.toLocaleString('es-ES')} €
- Anticipos recibidos: ${s.anticipos_recibidos?.toLocaleString('es-ES') || 0} €
- Pendiente real (restando anticipos): ${s.pendiente_real?.toLocaleString('es-ES') || s.importe_pendiente?.toLocaleString('es-ES')} €
- Valor total presupuestos: ${s.valor_presupuestos?.toLocaleString('es-ES') || 0} €

`;
  }
  
  if (context.lastRecords) {
    const { clientes, citas, presupuestos, facturas } = context.lastRecords;
    
    if (clientes && clientes.length > 0) {
      contextInfo += `=== CLIENTES RECIENTES (${clientes.length} de los últimos) ===\n`;
      contextInfo += JSON.stringify(clientes, null, 2) + '\n\n';
    }
    
    if (citas && citas.length > 0) {
      contextInfo += `=== RECORDATORIOS PENDIENTES (${citas.length}) ===\n`;
      contextInfo += JSON.stringify(citas, null, 2) + '\n\n';
    }
    
    if (presupuestos && presupuestos.length > 0) {
      contextInfo += `=== PRESUPUESTOS RECIENTES (${presupuestos.length}) ===\n`;
      contextInfo += JSON.stringify(presupuestos, null, 2) + '\n\n';
    }
    
    if (facturas && facturas.length > 0) {
      contextInfo += `=== TRABAJOS RECIENTES (${facturas.length}) ===\n`;
      contextInfo += JSON.stringify(facturas, null, 2) + '\n\n';
    }
  }
  
  if (context.selectedRecord) {
    contextInfo += `=== REGISTRO SELECCIONADO ===\n`;
    contextInfo += JSON.stringify(context.selectedRecord, null, 2) + '\n\n';
  }

  const basePrompt = `Eres "Copiloto", asistente inteligente de un CRM de gestión de trabajos y presupuestos.
Responde siempre en español, de forma directa y profesional.

${contextInfo}

REGLAS CRÍTICAS:
1. NUNCA prometas mostrar listas o datos sin incluirlos. Si dices "aquí tienes la lista", DEBES incluir los datos inmediatamente después.
2. SIEMPRE que el usuario pida datos, muéstralos con formato claro usando listas con viñetas o tablas markdown.
3. USA los datos del contexto anterior para responder. Si la información está en el resumen financiero o en los registros, úsala directamente.
4. Si no tienes datos suficientes, di claramente "No tengo datos de X" en lugar de prometer mostrarlos.
5. Formatea las cantidades monetarias con € y separadores de miles.
6. Para listas, usa formato:
   • **Nombre** - Detalle
   • **Nombre** - Detalle

FORMATO DE RESPUESTA (JSON obligatorio):
{
  "reply": "tu respuesta completa con todos los datos incluidos",
  "actions": [] 
}`;

  if (mode === 'read') {
    return basePrompt + `

MODO LECTURA: Solo consultas, array "actions" vacío.
Responde consultas sobre clientes, presupuestos, trabajos, citas, análisis financieros y estadísticas.
Incluye SIEMPRE los datos relevantes en tu respuesta.`;
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

// Call Mistral API only (no fallback to Lovable AI)
async function callAI(messages: Message[], systemPrompt: string): Promise<MistralResponse> {
  const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
  
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY not configured');
  }
  
  const aiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  console.log('Calling Mistral API...');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Mistral API error:', response.status, errorText);
    throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
  }

  console.log('Mistral API responded successfully');
  const data = await response.json();
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

// Default user ID for single-session mode (no login required)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

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

    // Use authenticated user if available, otherwise use default session user
    let userId: string = DEFAULT_USER_ID;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabaseAuth.auth.getUser(token);
      if (user) {
        userId = user.id;
        console.log('Authenticated user ID:', userId);
      }
    }
    
    console.log('Using user ID:', userId, 'Mode:', mode);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(mode, context || {});

    // Call AI (Mistral)
    const aiResponse = await callAI(messages, systemPrompt);

    let executedActions: { action: Action; success: boolean; error?: string }[] = [];

    // Execute actions if in operate mode - use authenticated or default user ID
    if (mode === 'operate' && aiResponse.actions && aiResponse.actions.length > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      
      executedActions = await executeActions(
        aiResponse.actions,
        userId,
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

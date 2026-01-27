import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { instrucciones_sistema, mensaje_usuario } = await req.json();

    if (!mensaje_usuario) {
      return new Response(
        JSON.stringify({ error: 'mensaje_usuario is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Combine system instructions with user message
    const fullPrompt = instrucciones_sistema 
      ? `${instrucciones_sistema}\n\nPregunta:\n${mensaje_usuario}`
      : mensaje_usuario;

    // Los modelos cambian con frecuencia. Probamos aliases/ids conocidos y solo hacemos fallback en 404.
    const modelCandidates = [
      'gemini-flash-latest',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
    ];

    let response: Response | null = null;
    let lastErrorText = '';
    for (const model of modelCandidates) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: fullPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          }),
        }
      );

      if (response.ok) break;

      lastErrorText = await response.text();
      // 404 -> probamos el siguiente modelo; otros errores (429/401/403) se devuelven tal cual.
      if (response.status !== 404) {
        console.error('Gemini API error:', response.status, lastErrorText);
        return new Response(
          JSON.stringify({
            error: `Gemini API error: ${response.status}`,
            details: lastErrorText,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (!response) {
      throw new Error('No se pudo contactar con Gemini');
    }

    if (!response.ok) {
      // Si llegamos aquí, es que todos dieron 404.
      console.error('Gemini API error:', response.status, lastErrorText);
      return new Response(
        JSON.stringify({
          error: `Gemini API error: ${response.status}`,
          details: lastErrorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar una respuesta.';

    return new Response(
      JSON.stringify({ response: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in gemini-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

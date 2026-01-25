import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { presupuestoId } = await req.json();
    if (!presupuestoId) {
      throw new Error('presupuestoId is required');
    }

    // Fetch presupuesto
    const { data: presupuesto, error: presError } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('id', presupuestoId)
      .eq('user_id', user.id)
      .single();

    if (presError || !presupuesto) {
      throw new Error('Presupuesto not found');
    }

    // Fetch empresa data
    const { data: empresa, error: empError } = await supabase
      .from('empresa_usuario')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (empError || !empresa) {
      throw new Error('Company data not found');
    }

    // Format helpers
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      }).format(value);
    };

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };

    // Generate partidas HTML
    const partidas = presupuesto.partidas || [];
    const partidasHtml = partidas.map((p: { concepto: string; cantidad: number; precio_unidad: number; importe_linea: number }) => `
      <tr>
        <td>${p.concepto}</td>
        <td class="num">${p.cantidad}</td>
        <td class="num">${formatCurrency(p.precio_unidad)} €</td>
        <td class="num">${formatCurrency(p.importe_linea)} €</td>
      </tr>
    `).join('');

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Presupuesto ${presupuesto.numero_presupuesto}</title>
  <style>
    * {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      padding: 40px 50px;
      font-size: 12px;
      color: #222;
    }
    .page {
      width: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
      padding-bottom: 15px;
    }
    .logo {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
    }
    .company-data {
      text-align: right;
      font-size: 11px;
      line-height: 1.4;
    }
    .title-block {
      margin: 25px 0 20px 0;
    }
    .title-main {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .title-sub {
      margin-top: 5px;
      font-size: 11px;
      color: #666;
    }
    .two-columns {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      margin-bottom: 25px;
    }
    .card {
      border: 1px solid #eee;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 11px;
      flex: 1;
    }
    .card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: #555;
    }
    .card p {
      margin: 2px 0;
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin: 20px 0 8px 0;
      color: #333;
    }
    .description {
      font-size: 11px;
      line-height: 1.4;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fafafa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
    }
    thead tr {
      background: #f5f5f5;
    }
    th, td {
      padding: 8px 6px;
      border-bottom: 1px solid #eee;
    }
    th {
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
    }
    td.num, th.num {
      text-align: right;
      white-space: nowrap;
    }
    .totals {
      margin-top: 10px;
      width: 40%;
      margin-left: auto;
      font-size: 11px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    .totals-row.total {
      margin-top: 4px;
      border-top: 1px solid #ccc;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 700;
    }
    .totals-row span:last-child {
      text-align: right;
      min-width: 80px;
    }
    .conditions {
      margin-top: 25px;
      font-size: 10px;
      line-height: 1.4;
      color: #555;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    .signature-block {
      margin-top: 30px;
      font-size: 11px;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    .signature-text {
      margin-bottom: 40px;
    }
    .signature-line {
      margin-top: 35px;
    }
    .footer {
      position: fixed;
      bottom: 20px;
      left: 50px;
      right: 50px;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 5px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        ${empresa.empresa_logo_url ? `<img class="logo" src="${empresa.empresa_logo_url}" alt="Logo empresa" />` : ''}
      </div>
      <div class="company-data">
        <strong>${empresa.empresa_nombre}</strong><br />
        CIF: ${empresa.empresa_cif}<br />
        ${empresa.empresa_direccion}<br />
        ${empresa.empresa_cp} ${empresa.empresa_ciudad} (${empresa.empresa_provincia})<br />
        Tel: ${empresa.empresa_telefono} · ${empresa.empresa_email}<br />
        ${empresa.empresa_web || ''}
      </div>
    </div>

    <div class="title-block">
      <div class="title-main">
        PRESUPUESTO Nº ${presupuesto.numero_presupuesto}
      </div>
      <div class="title-sub">
        Fecha: ${formatDate(presupuesto.fecha_presupuesto)} · Validez de la oferta: ${presupuesto.validez_dias} días
      </div>
    </div>

    <div class="two-columns">
      <div class="card">
        <div class="card-title">Datos del cliente</div>
        <p><strong>${presupuesto.cliente_nombre}</strong></p>
        <p>${presupuesto.cliente_direccion || ''}</p>
        <p>${presupuesto.cliente_cp || ''} ${presupuesto.cliente_ciudad || ''} ${presupuesto.cliente_provincia ? `(${presupuesto.cliente_provincia})` : ''}</p>
        <p>Tel: ${presupuesto.cliente_telefono || ''}</p>
        <p>Email: ${presupuesto.cliente_email || ''}</p>
      </div>
      <div class="card">
        <div class="card-title">Resumen</div>
        <p><strong>Trabajo:</strong> ${presupuesto.obra_titulo}</p>
        <p><strong>Estado:</strong> ${presupuesto.estado_presupuesto}</p>
        <p><strong>Comercial:</strong> ${presupuesto.comercial_nombre || '-'}</p>
      </div>
    </div>

    ${presupuesto.descripcion_trabajo_larga ? `
    <div class="section-title">Descripción del trabajo</div>
    <div class="description">
      ${presupuesto.descripcion_trabajo_larga}
    </div>
    ` : ''}

    <div class="section-title">Detalle económico</div>
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="num">Cantidad</th>
          <th class="num">Precio unidad</th>
          <th class="num">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${partidasHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(presupuesto.subtotal)} €</span>
      </div>
      <div class="totals-row">
        <span>IVA ${presupuesto.iva_porcentaje}%</span>
        <span>${formatCurrency(presupuesto.iva_importe)} €</span>
      </div>
      <div class="totals-row total">
        <span>Total presupuesto</span>
        <span>${formatCurrency(presupuesto.total_presupuesto)} €</span>
      </div>
    </div>

    ${empresa.condiciones_generales ? `
    <div class="conditions">
      <strong>Condiciones generales:</strong><br />
      ${empresa.condiciones_generales}
    </div>
    ` : ''}

    <div class="signature-block">
      <div class="signature-text">
        "Acepto el presente presupuesto y las condiciones indicadas."
      </div>
      <div class="signature-line">
        Firma y DNI del cliente: _______________________________
      </div>
      <div class="signature-line">
        Fecha: ____ / ____ / __________
      </div>
    </div>

    <div class="footer">
      ${empresa.empresa_nombre} · ${empresa.empresa_direccion} · ${empresa.empresa_cp} ${empresa.empresa_ciudad} (${empresa.empresa_provincia}) · Tel: ${empresa.empresa_telefono} · ${empresa.empresa_email}
    </div>
  </div>
</body>
</html>`;

    // Store HTML as a file (browsers can print this as PDF)
    const fileName = `${user.id}/${presupuesto.numero_presupuesto.replace(/\//g, '-')}.html`;
    
    const { error: uploadError } = await supabase.storage
      .from('presupuestos-pdf')
      .upload(fileName, new Blob([html], { type: 'text/html' }), { 
        upsert: true,
        contentType: 'text/html'
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('presupuestos-pdf')
      .getPublicUrl(fileName);

    // Update presupuesto with PDF URL
    await supabase
      .from('presupuestos')
      .update({ pdf_url: publicUrl })
      .eq('id', presupuestoId);

    return new Response(
      JSON.stringify({ pdfUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

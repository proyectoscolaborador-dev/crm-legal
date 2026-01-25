import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useClients } from '@/hooks/useClients';
import { Partida, PresupuestoFormData } from '@/types/empresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Loader2, 
  Save,
  FileText,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PresupuestoEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const { user, loading: authLoading } = useAuth();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, createPresupuesto, updatePresupuesto, getNextNumero } = usePresupuestos();
  const { clients } = useClients();

  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  const [formData, setFormData] = useState<PresupuestoFormData>({
    numero_presupuesto: '',
    cliente_nombre: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_direccion: '',
    cliente_cp: '',
    cliente_ciudad: '',
    cliente_provincia: '',
    descripcion_trabajo_larga: '',
    obra_titulo: '',
    partidas: [{ concepto: '', cantidad: 1, precio_unidad: 0, importe_linea: 0 }],
    iva_porcentaje: 21,
    estado_presupuesto: 'borrador',
    fecha_presupuesto: new Date().toISOString().split('T')[0],
    validez_dias: 30,
    comercial_nombre: '',
    work_id: null,
  });

  // Load existing presupuesto if editing
  useEffect(() => {
    if (isEditing && presupuestos.length > 0) {
      const existing = presupuestos.find(p => p.id === id);
      if (existing) {
        setFormData({
          numero_presupuesto: existing.numero_presupuesto,
          cliente_nombre: existing.cliente_nombre,
          cliente_email: existing.cliente_email || '',
          cliente_telefono: existing.cliente_telefono || '',
          cliente_direccion: existing.cliente_direccion || '',
          cliente_cp: existing.cliente_cp || '',
          cliente_ciudad: existing.cliente_ciudad || '',
          cliente_provincia: existing.cliente_provincia || '',
          descripcion_trabajo_larga: existing.descripcion_trabajo_larga || '',
          obra_titulo: existing.obra_titulo,
          partidas: existing.partidas || [],
          iva_porcentaje: existing.iva_porcentaje,
          estado_presupuesto: existing.estado_presupuesto,
          fecha_presupuesto: existing.fecha_presupuesto,
          validez_dias: existing.validez_dias,
          comercial_nombre: existing.comercial_nombre || '',
          work_id: existing.work_id,
        });
      }
    } else if (!isEditing) {
      setFormData(prev => ({ ...prev, numero_presupuesto: getNextNumero() }));
    }
  }, [isEditing, id, presupuestos, getNextNumero]);

  // Redirect if empresa not complete
  useEffect(() => {
    if (!empresaLoading && !isEmpresaComplete && user) {
      navigate('/mis-datos-empresa', { 
        state: { returnTo: isEditing ? `/presupuestos/${id}` : '/presupuestos/nuevo' },
        replace: true 
      });
    }
  }, [empresaLoading, isEmpresaComplete, user, navigate, isEditing, id]);

  if (authLoading || empresaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        cliente_nombre: client.name,
        cliente_email: client.email || '',
        cliente_telefono: client.phone || '',
      }));
    }
  };

  const updatePartida = (index: number, field: keyof Partida, value: string | number) => {
    const newPartidas = [...formData.partidas];
    newPartidas[index] = { ...newPartidas[index], [field]: value };
    
    // Recalculate line total
    if (field === 'cantidad' || field === 'precio_unidad') {
      const cantidad = field === 'cantidad' ? Number(value) : newPartidas[index].cantidad;
      const precio = field === 'precio_unidad' ? Number(value) : newPartidas[index].precio_unidad;
      newPartidas[index].importe_linea = cantidad * precio;
    }
    
    setFormData(prev => ({ ...prev, partidas: newPartidas }));
  };

  const addPartida = () => {
    setFormData(prev => ({
      ...prev,
      partidas: [...prev.partidas, { concepto: '', cantidad: 1, precio_unidad: 0, importe_linea: 0 }],
    }));
  };

  const removePartida = (index: number) => {
    if (formData.partidas.length > 1) {
      setFormData(prev => ({
        ...prev,
        partidas: prev.partidas.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.partidas.reduce((sum, p) => sum + (p.importe_linea || 0), 0);
    const iva_importe = subtotal * (formData.iva_porcentaje / 100);
    const total = subtotal + iva_importe;
    return { subtotal, iva_importe, total };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const generatePdf = async (presupuestoId: string) => {
    if (!empresa) return null;
    
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presupuesto-pdf', {
        body: { presupuestoId },
      });
      
      if (error) throw error;
      return data.pdfUrl;
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar el PDF');
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let presupuestoId: string;
      
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData });
        presupuestoId = id!;
      } else {
        const result = await createPresupuesto.mutateAsync(formData);
        presupuestoId = result.id;
      }

      // Generate PDF
      const pdfUrl = await generatePdf(presupuestoId);
      if (pdfUrl) {
        await updatePresupuesto.mutateAsync({ id: presupuestoId, pdf_url: pdfUrl } as any);
        toast.success('PDF generado correctamente');
      }

      navigate('/presupuestos');
    } catch {
      // Error handled by mutation
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, iva_importe, total } = calculateTotals();
  const isFormValid = formData.cliente_nombre && formData.obra_titulo && formData.partidas.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/presupuestos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {isEditing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              type="submit" 
              form="presupuesto-form"
              disabled={!isFormValid || saving || generatingPdf}
              className="gap-2"
            >
              {saving || generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {generatingPdf ? 'Generando PDF...' : 'Guardar'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl px-4 py-6">
        <form id="presupuesto-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nº Presupuesto</Label>
                  <Input
                    name="numero_presupuesto"
                    value={formData.numero_presupuesto}
                    onChange={handleChange}
                    className="bg-muted border-border font-mono"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    name="fecha_presupuesto"
                    value={formData.fecha_presupuesto}
                    onChange={handleChange}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validez (días)</Label>
                  <Input
                    type="number"
                    name="validez_dias"
                    value={formData.validez_dias}
                    onChange={handleChange}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título del trabajo *</Label>
                  <Input
                    name="obra_titulo"
                    value={formData.obra_titulo}
                    onChange={handleChange}
                    placeholder="Ej: Reforma integral cocina"
                    className="bg-muted border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select 
                    value={formData.estado_presupuesto} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, estado_presupuesto: v as any }))}
                  >
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="aceptado">Aceptado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comercial</Label>
                <Input
                  name="comercial_nombre"
                  value={formData.comercial_nombre || ''}
                  onChange={handleChange}
                  placeholder="Nombre del comercial"
                  className="bg-muted border-border"
                />
              </div>
            </CardContent>
          </Card>

          {/* Client */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length > 0 && (
                <div className="space-y-2">
                  <Label>Seleccionar cliente existente</Label>
                  <Select onValueChange={handleClientSelect}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue placeholder="Elegir cliente..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del cliente *</Label>
                  <Input
                    name="cliente_nombre"
                    value={formData.cliente_nombre}
                    onChange={handleChange}
                    placeholder="Nombre completo"
                    className="bg-muted border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    name="cliente_email"
                    value={formData.cliente_email || ''}
                    onChange={handleChange}
                    placeholder="email@cliente.com"
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    name="cliente_telefono"
                    value={formData.cliente_telefono || ''}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  name="cliente_direccion"
                  value={formData.cliente_direccion || ''}
                  onChange={handleChange}
                  placeholder="Calle, número..."
                  className="bg-muted border-border"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CP</Label>
                  <Input
                    name="cliente_cp"
                    value={formData.cliente_cp || ''}
                    onChange={handleChange}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    name="cliente_ciudad"
                    value={formData.cliente_ciudad || ''}
                    onChange={handleChange}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input
                    name="cliente_provincia"
                    value={formData.cliente_provincia || ''}
                    onChange={handleChange}
                    className="bg-muted border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Descripción del trabajo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                name="descripcion_trabajo_larga"
                value={formData.descripcion_trabajo_larga || ''}
                onChange={handleChange}
                placeholder="Describe detalladamente el trabajo a realizar..."
                rows={4}
                className="bg-muted border-border resize-none"
              />
            </CardContent>
          </Card>

          {/* Partidas */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Partidas</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPartida}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.partidas.map((partida, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <Label className="text-xs">Concepto</Label>
                    <Input
                      value={partida.concepto}
                      onChange={(e) => updatePartida(index, 'concepto', e.target.value)}
                      placeholder="Descripción..."
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      value={partida.cantidad}
                      onChange={(e) => updatePartida(index, 'cantidad', e.target.value)}
                      className="bg-muted border-border text-sm"
                      min={1}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Precio/ud</Label>
                    <Input
                      type="number"
                      value={partida.precio_unidad}
                      onChange={(e) => updatePartida(index, 'precio_unidad', e.target.value)}
                      className="bg-muted border-border text-sm"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Importe</Label>
                    <Input
                      value={formatCurrency(partida.importe_linea)}
                      className="bg-muted border-border text-sm"
                      readOnly
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removePartida(index)}
                      disabled={formData.partidas.length === 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex justify-between w-48 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between w-48 text-sm gap-2">
                    <span className="text-muted-foreground">IVA</span>
                    <Input
                      type="number"
                      name="iva_porcentaje"
                      value={formData.iva_porcentaje}
                      onChange={handleChange}
                      className="w-16 h-7 text-xs bg-muted border-border text-right"
                    />
                    <span className="text-muted-foreground">%</span>
                    <span className="w-20 text-right">{formatCurrency(iva_importe)}</span>
                  </div>
                  <div className="flex justify-between w-48 text-lg font-semibold border-t border-border pt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}

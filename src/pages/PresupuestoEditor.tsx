import { useState, useEffect, useMemo } from 'react';
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
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { generatePresupuestoPdf, downloadPdf, openPdfInNewTab } from '@/lib/pdfGenerator';

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
    pdf_url: null,
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
          pdf_url: existing.pdf_url,
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
        cliente_direccion: client.address || '',
        cliente_cp: client.postal_code || '',
        cliente_ciudad: client.city || '',
        cliente_provincia: client.province || '',
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

  // Real-time calculated totals with useMemo for performance
  const { subtotal, iva_importe, total } = useMemo(() => {
    const sub = formData.partidas.reduce((sum, p) => sum + (p.importe_linea || 0), 0);
    const iva = sub * (formData.iva_porcentaje / 100);
    return { subtotal: sub, iva_importe: iva, total: sub + iva };
  }, [formData.partidas, formData.iva_porcentaje]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Generate PDF locally with jsPDF
  const handlePreviewPdf = async () => {
    if (!empresa) {
      toast.error('Falta configurar los datos de empresa');
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generatePresupuestoPdf({
        presupuesto: {
          numero_presupuesto: formData.numero_presupuesto,
          fecha_presupuesto: formData.fecha_presupuesto,
          validez_dias: formData.validez_dias,
          cliente_nombre: formData.cliente_nombre,
          cliente_direccion: formData.cliente_direccion,
          cliente_cp: formData.cliente_cp,
          cliente_ciudad: formData.cliente_ciudad,
          cliente_provincia: formData.cliente_provincia,
          cliente_telefono: formData.cliente_telefono,
          cliente_email: formData.cliente_email,
          obra_titulo: formData.obra_titulo,
          descripcion_trabajo_larga: formData.descripcion_trabajo_larga,
          comercial_nombre: formData.comercial_nombre,
          estado_presupuesto: formData.estado_presupuesto,
          partidas: formData.partidas,
          iva_porcentaje: formData.iva_porcentaje,
        },
        empresa,
        subtotal,
        iva_importe,
        total,
      });
      
      openPdfInNewTab(pdfBlob);
      toast.success('PDF generado correctamente');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!empresa) {
      toast.error('Falta configurar los datos de empresa');
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generatePresupuestoPdf({
        presupuesto: {
          numero_presupuesto: formData.numero_presupuesto,
          fecha_presupuesto: formData.fecha_presupuesto,
          validez_dias: formData.validez_dias,
          cliente_nombre: formData.cliente_nombre,
          cliente_direccion: formData.cliente_direccion,
          cliente_cp: formData.cliente_cp,
          cliente_ciudad: formData.cliente_ciudad,
          cliente_provincia: formData.cliente_provincia,
          cliente_telefono: formData.cliente_telefono,
          cliente_email: formData.cliente_email,
          obra_titulo: formData.obra_titulo,
          descripcion_trabajo_larga: formData.descripcion_trabajo_larga,
          comercial_nombre: formData.comercial_nombre,
          estado_presupuesto: formData.estado_presupuesto,
          partidas: formData.partidas,
          iva_porcentaje: formData.iva_porcentaje,
        },
        empresa,
        subtotal,
        iva_importe,
        total,
      });
      
      const filename = `Presupuesto-${formData.numero_presupuesto.replace(/\//g, '-')}.pdf`;
      downloadPdf(pdfBlob, filename);
      toast.success('PDF descargado correctamente');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData });
      } else {
        await createPresupuesto.mutateAsync(formData);
      }

      toast.success(isEditing ? 'Presupuesto actualizado' : 'Presupuesto creado');
      navigate('/presupuestos');
    } catch {
      // Error handled by mutation
    } finally {
      setSaving(false);
    }
  };

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
              type="button"
              variant="outline"
              onClick={handlePreviewPdf}
              disabled={!formData.cliente_nombre || !formData.obra_titulo || generatingPdf}
              className="gap-2"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Ver PDF</span>
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={!formData.cliente_nombre || !formData.obra_titulo || generatingPdf}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>
            <Button 
              type="submit" 
              form="presupuesto-form"
              disabled={!isFormValid || saving || generatingPdf}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Guardar</span>
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
                    <SelectTrigger className="bg-muted border-border h-12">
                      <SelectValue placeholder="Elegir cliente..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.nif ? `(${c.nif})` : ''}
                        </SelectItem>
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
                    className="bg-muted border-border h-12"
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
                    className="bg-muted border-border h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    name="cliente_telefono"
                    value={formData.cliente_telefono || ''}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className="bg-muted border-border h-12"
                    inputMode="tel"
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
                  className="bg-muted border-border h-12"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CP</Label>
                  <Input
                    name="cliente_cp"
                    value={formData.cliente_cp || ''}
                    onChange={handleChange}
                    className="bg-muted border-border h-12"
                    inputMode="numeric"
                    placeholder="28001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    name="cliente_ciudad"
                    value={formData.cliente_ciudad || ''}
                    onChange={handleChange}
                    className="bg-muted border-border h-12"
                    placeholder="Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input
                    name="cliente_provincia"
                    value={formData.cliente_provincia || ''}
                    onChange={handleChange}
                    className="bg-muted border-border h-12"
                    placeholder="Madrid"
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

          {/* Partidas - Mobile Optimized */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Partidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.partidas.map((partida, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  {/* Mobile: Stack vertically, Desktop: Grid */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Concepto</Label>
                    <Input
                      value={partida.concepto}
                      onChange={(e) => updatePartida(index, 'concepto', e.target.value)}
                      placeholder="Descripción del trabajo..."
                      className="bg-muted border-border text-base h-12"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Cantidad</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={partida.cantidad}
                        onChange={(e) => updatePartida(index, 'cantidad', e.target.value)}
                        className="bg-muted border-border text-base h-12 text-center"
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Precio/ud (€)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={partida.precio_unidad}
                        onChange={(e) => updatePartida(index, 'precio_unidad', e.target.value)}
                        className="bg-muted border-border text-base h-12 text-center"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Importe</Label>
                      <Input
                        value={formatCurrency(partida.importe_linea)}
                        className="bg-muted border-border text-base h-12 text-center font-semibold text-primary"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  {/* Delete button - more visible on mobile */}
                  <Button 
                    type="button" 
                    variant="outline"
                    size="sm"
                    onClick={() => removePartida(index)}
                    disabled={formData.partidas.length === 1}
                    className="w-full h-10 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar partida
                  </Button>
                </div>
              ))}

              {/* Large Add Button - Mobile Optimized */}
              <Button 
                type="button" 
                variant="outline" 
                onClick={addPartida}
                className="w-full h-14 text-base gap-3 border-dashed border-2 border-primary/50 hover:border-primary hover:bg-primary/5"
              >
                <Plus className="h-5 w-5" />
                Añadir Partida
              </Button>

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

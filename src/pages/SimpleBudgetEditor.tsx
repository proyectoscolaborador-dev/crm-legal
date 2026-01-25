import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useWorks } from '@/hooks/useWorks';
import { Partida, PresupuestoFormData } from '@/types/empresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { generatePresupuestoPdf, downloadPdf, DocumentType } from '@/lib/pdfGenerator';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { WorkflowActionBar, PresupuestoEstado } from '@/components/WorkflowActionBar';
import { RejectConfirmDialog } from '@/components/RejectConfirmDialog';
import { InvoiceIssueDialog } from '@/components/InvoiceIssueDialog';

// Helper to create an empty partida
const createEmptyPartida = (): Partida => ({
  id: crypto.randomUUID(),
  concepto: '',
  cantidad: 1,
  precio_unidad: 0,
  importe_linea: 0,
});

// Helper to create initial empty form data
const createInitialFormData = (): PresupuestoFormData => ({
  numero_presupuesto: '',
  cliente_nombre: '',
  cliente_nif: '',
  cliente_email: '',
  cliente_telefono: '',
  cliente_direccion: '',
  cliente_cp: '',
  cliente_ciudad: '',
  cliente_provincia: '',
  descripcion_trabajo_larga: '',
  obra_titulo: '',
  partidas: [createEmptyPartida()],
  iva_porcentaje: 21,
  estado_presupuesto: 'borrador',
  fecha_presupuesto: new Date().toISOString().split('T')[0],
  validez_dias: 30,
  comercial_nombre: '',
  work_id: null,
  pdf_url: null,
});

// Helper to generate invoice number
const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `FAC-${year}-${random}`;
};

export default function SimpleBudgetEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditing = !!id;
  
  // Get work/client data passed from navigation state
  const routeState = location.state as { workId?: string; client?: any } | null;
  
  const { user, loading: authLoading } = useAuth();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, createPresupuesto, updatePresupuesto, getNextNumero, isLoading: presupuestosLoading } = usePresupuestos();
  const { works, updateWork, updateWorkStatus, deleteWork } = useWorks();

  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Workflow dialogs
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Invoice number (local state until saved)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  
  // LOCAL STATE for form - completely decoupled from database
  const [formData, setFormData] = useState<PresupuestoFormData>(createInitialFormData);

  // Get current work from formData.work_id
  const currentWork = useMemo(() => {
    return works.find(w => w.id === formData.work_id);
  }, [works, formData.work_id]);

  // Determine if document is read-only (after invoicing)
  const isReadOnly = formData.estado_presupuesto === 'facturado';

  // Load data based on context (existing budget OR new from work)
  useEffect(() => {
    if (dataLoaded) return;
    
    // Case 1: Editing existing presupuesto
    if (isEditing && !presupuestosLoading && presupuestos.length > 0) {
      const existing = presupuestos.find(p => p.id === id);
      if (existing) {
        setFormData({
          numero_presupuesto: existing.numero_presupuesto,
          cliente_nombre: existing.cliente_nombre || '',
          cliente_nif: existing.cliente_nif || '',
          cliente_email: existing.cliente_email || '',
          cliente_telefono: existing.cliente_telefono || '',
          cliente_direccion: existing.cliente_direccion || '',
          cliente_cp: existing.cliente_cp || '',
          cliente_ciudad: existing.cliente_ciudad || '',
          cliente_provincia: existing.cliente_provincia || '',
          descripcion_trabajo_larga: existing.descripcion_trabajo_larga || '',
          obra_titulo: existing.obra_titulo || '',
          partidas: (existing.partidas || []).map(p => ({ 
            ...p, 
            id: p.id || crypto.randomUUID() 
          })),
          iva_porcentaje: existing.iva_porcentaje || 21,
          estado_presupuesto: existing.estado_presupuesto || 'borrador',
          fecha_presupuesto: existing.fecha_presupuesto || new Date().toISOString().split('T')[0],
          validez_dias: existing.validez_dias || 30,
          comercial_nombre: existing.comercial_nombre || '',
          work_id: existing.work_id,
          pdf_url: existing.pdf_url,
        });
        setDataLoaded(true);
        return;
      }
    }
    
    // Case 2: New presupuesto from Work context
    if (!isEditing && routeState?.workId && routeState?.client) {
      const client = routeState.client;
      const work = works.find(w => w.id === routeState.workId);
      
      setFormData({
        ...createInitialFormData(),
        numero_presupuesto: getNextNumero(),
        cliente_nombre: client.name || '',
        cliente_nif: client.nif || '',
        cliente_email: client.email || '',
        cliente_telefono: client.phone || '',
        cliente_direccion: client.address || '',
        cliente_cp: client.postal_code || '',
        cliente_ciudad: client.city || '',
        cliente_provincia: client.province || '',
        obra_titulo: work?.title || '',
        descripcion_trabajo_larga: work?.description || '',
        work_id: routeState.workId,
      });
      setDataLoaded(true);
      return;
    }
    
    // Case 3: New presupuesto without context (should not happen with new flow)
    if (!isEditing && !presupuestosLoading) {
      setFormData(prev => ({ ...prev, numero_presupuesto: getNextNumero() }));
      setDataLoaded(true);
    }
  }, [isEditing, id, presupuestos, presupuestosLoading, routeState, works, getNextNumero, dataLoaded]);

  // Redirect if empresa not complete
  useEffect(() => {
    if (!empresaLoading && !isEmpresaComplete && user) {
      navigate('/mis-datos-empresa', { 
        state: { returnTo: '/' },
        replace: true 
      });
    }
  }, [empresaLoading, isEmpresaComplete, user, navigate]);

  // Handle auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // === FORM HANDLERS (all use local state only) ===
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updatePartida = (index: number, field: keyof Partida, value: string | number) => {
    if (isReadOnly) return;
    setFormData(prev => {
      const newPartidas = [...prev.partidas];
      newPartidas[index] = { ...newPartidas[index], [field]: value };
      
      // Recalculate line total
      if (field === 'cantidad' || field === 'precio_unidad') {
        const cantidad = field === 'cantidad' ? Number(value) : newPartidas[index].cantidad;
        const precio = field === 'precio_unidad' ? Number(value) : newPartidas[index].precio_unidad;
        newPartidas[index].importe_linea = cantidad * precio;
      }
      
      return { ...prev, partidas: newPartidas };
    });
  };

  const addPartida = () => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      partidas: [...prev.partidas, createEmptyPartida()],
    }));
  };

  const removePartida = (index: number) => {
    if (isReadOnly) return;
    if (formData.partidas.length > 1) {
      setFormData(prev => ({
        ...prev,
        partidas: prev.partidas.filter((_, i) => i !== index),
      }));
    }
  };

  // Real-time calculated totals
  const { subtotal, iva_importe, total } = useMemo(() => {
    const sub = formData.partidas.reduce((sum, p) => sum + (p.importe_linea || 0), 0);
    const iva = sub * (formData.iva_porcentaje / 100);
    return { subtotal: sub, iva_importe: iva, total: sub + iva };
  }, [formData.partidas, formData.iva_porcentaje]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // === WORKFLOW HANDLERS ===
  
  const handleAcceptBudget = async () => {
    setIsProcessingAction(true);
    try {
      // Update presupuesto state
      setFormData(prev => ({ ...prev, estado_presupuesto: 'aceptado' }));
      
      // Save presupuesto with new state
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData, estado_presupuesto: 'aceptado' });
      }
      
      // Update work status if exists
      if (formData.work_id) {
        await updateWorkStatus.mutateAsync({ 
          id: formData.work_id, 
          status: 'presupuesto_aceptado', 
          position: 0 
        });
      }
      
      toast.success('¡Aceptado! Pasando a Obra...');
      navigate('/');
    } catch (err) {
      console.error('Error accepting budget:', err);
      toast.error('Error al aceptar el presupuesto');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectBudget = () => {
    setRejectDialogOpen(true);
  };

  const handleArchiveRejected = async () => {
    setIsProcessingAction(true);
    try {
      setFormData(prev => ({ ...prev, estado_presupuesto: 'rechazado' }));
      
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData, estado_presupuesto: 'rechazado' });
      }
      
      toast.success('Presupuesto marcado como rechazado');
      setRejectDialogOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Error archiving rejected:', err);
      toast.error('Error al archivar el presupuesto');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteRejected = async () => {
    setIsDeleting(true);
    try {
      if (formData.work_id) {
        await deleteWork.mutateAsync(formData.work_id);
      }
      toast.success('Trabajo eliminado correctamente');
      setRejectDialogOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Error deleting work:', err);
      toast.error('Error al eliminar el trabajo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleWorkCompleted = async () => {
    setIsProcessingAction(true);
    try {
      // Update presupuesto state to 'terminado'
      setFormData(prev => ({ ...prev, estado_presupuesto: 'terminado' }));
      
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData, estado_presupuesto: 'terminado' });
      }
      
      // Update work status
      if (formData.work_id) {
        await updateWorkStatus.mutateAsync({ 
          id: formData.work_id, 
          status: 'factura_enviada', 
          position: 0 
        });
      }
      
      toast.success('Trabajo terminado. Revisa las cantidades finales antes de facturar.', {
        duration: 5000,
      });
    } catch (err) {
      console.error('Error marking work completed:', err);
      toast.error('Error al marcar el trabajo como terminado');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleIssueInvoice = () => {
    setInvoiceDialogOpen(true);
  };

  const handleConfirmInvoice = async () => {
    setIsProcessingAction(true);
    try {
      const newInvoiceNumber = generateInvoiceNumber();
      setInvoiceNumber(newInvoiceNumber);
      
      // Update presupuesto state to 'facturado'
      const updatedData = { 
        ...formData, 
        estado_presupuesto: 'facturado' as const,
      };
      
      setFormData(updatedData);
      
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...updatedData });
      }
      
      // Update work with invoice number and mark as finished
      if (formData.work_id) {
        await updateWork.mutateAsync({ 
          id: formData.work_id, 
          invoice_number: newInvoiceNumber,
        });
        await updateWorkStatus.mutateAsync({ 
          id: formData.work_id, 
          status: 'trabajo_terminado', 
          position: 0 
        });
      }
      
      // Generate and download invoice PDF
      if (empresa) {
        const blob = await generatePresupuestoPdf({
          presupuesto: {
            numero_presupuesto: formData.numero_presupuesto,
            fecha_presupuesto: formData.fecha_presupuesto,
            validez_dias: formData.validez_dias,
            cliente_nombre: formData.cliente_nombre,
            cliente_nif: formData.cliente_nif,
            cliente_direccion: formData.cliente_direccion,
            cliente_cp: formData.cliente_cp,
            cliente_ciudad: formData.cliente_ciudad,
            cliente_provincia: formData.cliente_provincia,
            cliente_telefono: formData.cliente_telefono,
            cliente_email: formData.cliente_email,
            obra_titulo: formData.obra_titulo,
            descripcion_trabajo_larga: formData.descripcion_trabajo_larga,
            comercial_nombre: formData.comercial_nombre,
            estado_presupuesto: 'facturado',
            partidas: formData.partidas,
            iva_porcentaje: formData.iva_porcentaje,
            invoice_number: newInvoiceNumber,
          },
          empresa,
          subtotal,
          iva_importe,
          total,
          documentType: 'factura',
        });
        
        downloadPdf(blob, `Factura-${newInvoiceNumber.replace(/\//g, '-')}.pdf`);
      }
      
      toast.success(`Factura ${newInvoiceNumber} emitida correctamente`, {
        duration: 5000,
      });
      setInvoiceDialogOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Error issuing invoice:', err);
      toast.error('Error al emitir la factura');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // === PDF HANDLERS ===
  
  const handlePreviewPdf = useCallback(async () => {
    if (!empresa) {
      toast.error('Falta configurar los datos de empresa');
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const documentType: DocumentType = formData.estado_presupuesto === 'facturado' ? 'factura' : 'presupuesto';
      const blob = await generatePresupuestoPdf({
        presupuesto: {
          numero_presupuesto: formData.numero_presupuesto,
          fecha_presupuesto: formData.fecha_presupuesto,
          validez_dias: formData.validez_dias,
          cliente_nombre: formData.cliente_nombre,
          cliente_nif: formData.cliente_nif,
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
          invoice_number: invoiceNumber || currentWork?.invoice_number,
        },
        empresa,
        subtotal,
        iva_importe,
        total,
        documentType,
      });
      
      setPdfBlob(blob);
      setPdfModalOpen(true);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }, [empresa, formData, subtotal, iva_importe, total, invoiceNumber, currentWork]);

  const handleDownloadPdf = useCallback(async () => {
    if (!empresa) {
      toast.error('Falta configurar los datos de empresa');
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const documentType: DocumentType = formData.estado_presupuesto === 'facturado' ? 'factura' : 'presupuesto';
      const blob = await generatePresupuestoPdf({
        presupuesto: {
          numero_presupuesto: formData.numero_presupuesto,
          fecha_presupuesto: formData.fecha_presupuesto,
          validez_dias: formData.validez_dias,
          cliente_nombre: formData.cliente_nombre,
          cliente_nif: formData.cliente_nif,
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
          invoice_number: invoiceNumber || currentWork?.invoice_number,
        },
        empresa,
        subtotal,
        iva_importe,
        total,
        documentType,
      });
      
      const prefix = documentType === 'factura' ? 'Factura' : 'Presupuesto';
      const number = documentType === 'factura' && (invoiceNumber || currentWork?.invoice_number) 
        ? (invoiceNumber || currentWork?.invoice_number) 
        : formData.numero_presupuesto;
      const filename = `${prefix}-${(number || '').replace(/\//g, '-')}.pdf`;
      downloadPdf(blob, filename);
      toast.success('PDF descargado correctamente');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }, [empresa, formData, subtotal, iva_importe, total, invoiceNumber, currentWork]);

  // === SAVE HANDLER ===
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    setSaving(true);

    try {
      if (isEditing) {
        await updatePresupuesto.mutateAsync({ id: id!, ...formData });
        toast.success('Presupuesto actualizado');
      } else {
        await createPresupuesto.mutateAsync(formData);
        toast.success('Presupuesto creado');
      }
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // === RENDER ===
  
  if (authLoading || empresaLoading || presupuestosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFormValid = formData.cliente_nombre && formData.obra_titulo && formData.partidas.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">
                {isReadOnly 
                  ? 'Factura (Solo lectura)'
                  : isEditing 
                    ? 'Editar Presupuesto' 
                    : 'Nuevo Presupuesto'}
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
            {!isReadOnly && (
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
            )}
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="container max-w-3xl px-4 py-6">
        <form id="presupuesto-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* === WORKFLOW ACTION BAR === */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Estado del documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowActionBar
                estado={formData.estado_presupuesto as PresupuestoEstado}
                onAccept={handleAcceptBudget}
                onReject={handleRejectBudget}
                onWorkCompleted={handleWorkCompleted}
                onIssueInvoice={handleIssueInvoice}
                isLoading={isProcessingAction}
                isReadOnly={isReadOnly}
              />
            </CardContent>
          </Card>

          {/* Basic Info Card */}
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
                    className="bg-muted border-border font-mono h-12"
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado actual</Label>
                  <div className={`h-10 px-3 rounded-md flex items-center text-sm font-medium ${
                    formData.estado_presupuesto === 'facturado' ? 'bg-success/20 text-success' :
                    formData.estado_presupuesto === 'rechazado' ? 'bg-destructive/20 text-destructive' :
                    formData.estado_presupuesto === 'aceptado' ? 'bg-warning/20 text-warning' :
                    formData.estado_presupuesto === 'terminado' ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {formData.estado_presupuesto === 'borrador' && '📝 Borrador'}
                    {formData.estado_presupuesto === 'enviado' && '📤 Enviado'}
                    {formData.estado_presupuesto === 'aceptado' && '✅ Aceptado - En Obra'}
                    {formData.estado_presupuesto === 'en_proceso' && '🔧 En Proceso'}
                    {formData.estado_presupuesto === 'terminado' && '🏁 Terminado - Pendiente facturar'}
                    {formData.estado_presupuesto === 'rechazado' && '❌ Rechazado'}
                    {formData.estado_presupuesto === 'facturado' && '📄 Facturado'}
                  </div>
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
                  readOnly={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Data Card - NO CLIENT SELECTOR - Direct inputs only */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Datos del cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    readOnly={isReadOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIF / CIF</Label>
                  <Input
                    name="cliente_nif"
                    value={formData.cliente_nif || ''}
                    onChange={handleChange}
                    placeholder="12345678A"
                    className="bg-muted border-border h-12"
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                  readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
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
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
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
                readOnly={isReadOnly}
              />
            </CardContent>
          </Card>

          {/* Partidas Card */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Partidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.partidas.map((partida, index) => (
                <div key={partida.id || index} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Concepto</Label>
                    <Input
                      value={partida.concepto}
                      onChange={(e) => updatePartida(index, 'concepto', e.target.value)}
                      placeholder="Descripción del trabajo..."
                      className="bg-muted border-border text-base h-12"
                      readOnly={isReadOnly}
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
                        readOnly={isReadOnly}
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
                        readOnly={isReadOnly}
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
                  
                  {!isReadOnly && (
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
                  )}
                </div>
              ))}

              {/* Add Partida Button - Instant local state update */}
              {!isReadOnly && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addPartida}
                  className="w-full h-14 text-base gap-3 border-dashed border-2 border-primary/50 hover:border-primary hover:bg-primary/5"
                >
                  <Plus className="h-5 w-5" />
                  Añadir Partida
                </Button>
              )}

              {/* Totals */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex justify-between w-48 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between w-48 text-sm gap-2">
                    <span className="text-muted-foreground">IVA</span>
                    {!isReadOnly ? (
                      <Input
                        type="number"
                        name="iva_porcentaje"
                        value={formData.iva_porcentaje}
                        onChange={handleChange}
                        className="w-16 h-7 text-xs bg-muted border-border text-right"
                      />
                    ) : (
                      <span className="w-16 text-right">{formData.iva_porcentaje}</span>
                    )}
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

      {/* PDF Preview Modal - Internal, no popup blocking */}
      <PdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfBlob={pdfBlob}
        fileName={`${formData.estado_presupuesto === 'facturado' ? 'Factura' : 'Presupuesto'}-${formData.numero_presupuesto.replace(/\//g, '-')}.pdf`}
        clientPhone={formData.cliente_telefono}
        clientName={formData.cliente_nombre}
        presupuestoTitle={formData.obra_titulo}
      />

      {/* Reject Confirmation Dialog */}
      <RejectConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onArchive={handleArchiveRejected}
        onDelete={handleDeleteRejected}
        workTitle={formData.obra_titulo}
        isDeleting={isDeleting}
      />

      {/* Invoice Issue Confirmation Dialog */}
      <InvoiceIssueDialog
        isOpen={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        onConfirm={handleConfirmInvoice}
        workTitle={formData.obra_titulo}
        total={formatCurrency(total)}
        isProcessing={isProcessingAction}
      />
    </div>
  );
}

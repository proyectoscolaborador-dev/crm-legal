import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkWithClient, Client } from '@/types/database';
import { useWorks } from '@/hooks/useWorks';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  Mail, 
  Building2, 
  MessageSquare, 
  FileText, 
  Star,
  DollarSign,
  Calendar,
  CheckCircle,
  X,
  ExternalLink,
  Edit,
  Send,
  Download,
  Loader2,
  Eye,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientPanelProps {
  work: WorkWithClient | null;
  allWorks: WorkWithClient[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateWork: (updates: Partial<WorkWithClient> & { id: string }) => void;
}

export function ClientPanel({ work, allWorks, isOpen, onClose, onUpdateWork }: ClientPanelProps) {
  const navigate = useNavigate();
  const { markAsPaid, updateWorkStatus } = useWorks();
  const { presupuestos, isLoading: presupuestosLoading, updatePresupuesto } = usePresupuestos();
  const { empresa, isEmpresaComplete } = useEmpresa();
  const [editedWork, setEditedWork] = useState<Partial<WorkWithClient>>({});
  const [isSendingPresupuesto, setIsSendingPresupuesto] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);

  // Early return if no work - but still show sheet if open
  if (!work) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const client = work.client;

  // Find presupuesto linked to this work
  const linkedPresupuesto = presupuestos.find(p => p.work_id === work.id);

  // Calculate LTV
  const clientWorks = allWorks.filter(w => w.client_id === work.client_id);
  const ltv = clientWorks
    .filter(w => w.is_paid)
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const openWhatsApp = (message: string = '') => {
    if (!client?.phone) {
      toast.error('El cliente no tiene número de teléfono');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleEditPresupuesto = () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa primero');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }

    if (linkedPresupuesto) {
      navigate(`/presupuestos/${linkedPresupuesto.id}`);
    } else {
      // No presupuesto linked, create one first
      navigate('/presupuestos/nuevo', { state: { workId: work.id, client } });
    }
    onClose();
  };

  const handlePreviewPdf = async () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa primero');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }

    if (!linkedPresupuesto) {
      toast.error('No hay presupuesto asociado a este trabajo');
      return;
    }

    setIsPreviewingPdf(true);

    try {
      // Generate PDF preview (works even with 0€ amount)
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-presupuesto-pdf', {
        body: { presupuestoId: linkedPresupuesto.id }
      });

      if (pdfError) throw pdfError;

      // Update PDF URL in presupuesto
      if (pdfData?.pdfUrl) {
        await updatePresupuesto.mutateAsync({
          id: linkedPresupuesto.id,
          pdf_url: pdfData.pdfUrl,
        });
        
        // Open PDF in new tab
        window.open(pdfData.pdfUrl, '_blank');
        toast.success('Borrador PDF generado correctamente');
      }
    } catch (error: any) {
      console.error('Error generating preview PDF:', error);
      toast.error('Error al generar el borrador PDF: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsPreviewingPdf(false);
    }
  };

  const handleSendPresupuesto = async () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa primero');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }

    if (!linkedPresupuesto) {
      toast.error('No hay presupuesto asociado a este trabajo');
      return;
    }

    if (linkedPresupuesto.subtotal === 0) {
      toast.error('El presupuesto debe tener al menos una partida');
      return;
    }

    setIsSendingPresupuesto(true);

    try {
      // 1. Generate PDF via edge function
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-presupuesto-pdf', {
        body: { presupuestoId: linkedPresupuesto.id }
      });

      if (pdfError) throw pdfError;

      // 2. Update presupuesto status and PDF URL
      await updatePresupuesto.mutateAsync({
        id: linkedPresupuesto.id,
        estado_presupuesto: 'enviado',
        pdf_url: pdfData?.pdfUrl || null,
      });

      // 3. Update work status to "presupuesto_enviado"
      updateWorkStatus.mutate({ 
        id: work.id, 
        status: 'presupuesto_enviado',
        position: work.position 
      });

      toast.success('Presupuesto enviado correctamente');

      // Optional: Open WhatsApp with PDF link
      if (pdfData?.pdfUrl && client?.phone) {
        const message = `Hola ${client.name}, te envío el presupuesto para "${work.title}". Puedes verlo aquí: ${pdfData.pdfUrl}`;
        openWhatsApp(message);
      }
    } catch (error: any) {
      console.error('Error sending presupuesto:', error);
      toast.error('Error al enviar presupuesto: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSendingPresupuesto(false);
    }
  };

  const handleDownloadPdf = () => {
    if (linkedPresupuesto?.pdf_url) {
      window.open(linkedPresupuesto.pdf_url, '_blank');
    } else {
      toast.error('No hay PDF disponible');
    }
  };

  const handleRequestReview = () => {
    const reviewLink = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review';
    const message = `¡Hola ${client?.name}! 🙌\n\nEsperamos que estés muy contento/a con el trabajo realizado. Nos encantaría que nos dejaras una reseña en Google, nos ayuda muchísimo:\n\n${reviewLink}\n\n¡Muchas gracias! 🙏`;
    openWhatsApp(message);
  };

  const handleSave = () => {
    if (Object.keys(editedWork).length > 0) {
      onUpdateWork({ id: work.id, ...editedWork });
      setEditedWork({});
    }
  };

  const handleMarkAsPaid = () => {
    markAsPaid.mutate(work.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-foreground">
              {client?.name || 'Cliente'}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {client?.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {client.company}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue="contact" className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="contact">Contacto</TabsTrigger>
            <TabsTrigger value="finances">Finanzas</TabsTrigger>
            <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="space-y-3">
              {client?.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{client.email}</span>
                </div>
              )}
              
              {client?.phone && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{client.phone}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => openWhatsApp()}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>
              )}
            </div>

            {/* LTV */}
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">Life Time Value</span>
              </div>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(ltv)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {clientWorks.filter(w => w.is_paid).length} trabajo(s) pagado(s)
              </p>
            </div>

            {/* Notes */}
            {client?.notes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm text-foreground">{client.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finances" className="space-y-4 mt-4">
            {/* Current Work Info */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Trabajo Actual</p>
                <p className="font-medium text-foreground">{work.title}</p>
                {work.description && (
                  <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Monto</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <Input
                      type="number"
                      value={editedWork.amount ?? work.amount}
                      onChange={(e) => setEditedWork({ ...editedWork, amount: parseFloat(e.target.value) })}
                      className="bg-muted border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Nº Factura</Label>
                  <Input
                    value={editedWork.invoice_number ?? work.invoice_number ?? ''}
                    onChange={(e) => setEditedWork({ ...editedWork, invoice_number: e.target.value })}
                    placeholder="FAC-001"
                    className="bg-muted border-border mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Input
                    type="date"
                    value={editedWork.due_date ?? work.due_date ?? ''}
                    onChange={(e) => setEditedWork({ ...editedWork, due_date: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              {Object.keys(editedWork).length > 0 && (
                <Button onClick={handleSave} className="w-full">
                  Guardar Cambios
                </Button>
              )}
            </div>

            {/* Payment Status */}
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Estado de Pago</p>
                  <p className={`text-xs ${work.is_paid ? 'text-secondary' : 'text-warning'}`}>
                    {work.is_paid ? 'Pagado' : 'Pendiente de pago'}
                  </p>
                </div>
                {!work.is_paid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-secondary text-secondary hover:bg-secondary/10"
                    onClick={handleMarkAsPaid}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Pagado
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presupuesto" className="space-y-4 mt-4">
            {/* Loading state for presupuestos */}
            {presupuestosLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando presupuesto...</span>
              </div>
            ) : (
              <>
                {/* Presupuesto Status */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Estado Presupuesto</p>
                      <p className="text-xs text-muted-foreground">
                        {linkedPresupuesto 
                          ? `${linkedPresupuesto.estado_presupuesto.charAt(0).toUpperCase() + linkedPresupuesto.estado_presupuesto.slice(1)} - ${linkedPresupuesto.numero_presupuesto}`
                          : 'Sin presupuesto asociado'
                        }
                      </p>
                    </div>
                    {linkedPresupuesto && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        linkedPresupuesto.estado_presupuesto === 'enviado' 
                          ? 'bg-primary/20 text-primary' 
                          : linkedPresupuesto.estado_presupuesto === 'aceptado'
                          ? 'bg-secondary/20 text-secondary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {linkedPresupuesto.estado_presupuesto}
                      </span>
                    )}
                  </div>

                  {linkedPresupuesto && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="ml-2 font-medium">{formatCurrency(linkedPresupuesto.subtotal)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IVA:</span>
                        <span className="ml-2 font-medium">{formatCurrency(linkedPresupuesto.iva_importe)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2 font-bold text-lg">{formatCurrency(linkedPresupuesto.total_presupuesto)}</span>
                      </div>
                    </div>
                  )}

                  {!linkedPresupuesto && (
                    <Alert className="bg-warning/10 border-warning/30">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning text-sm">
                        No hay presupuesto vinculado a este trabajo. Pulsa "Editar Presupuesto" para crear uno.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Presupuesto Actions */}
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={handleEditPresupuesto}
                  >
                    <Edit className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">Editar Presupuesto</p>
                      <p className="text-xs text-muted-foreground">
                        {linkedPresupuesto ? 'Modificar partidas y detalles' : 'Crear nuevo presupuesto'}
                      </p>
                    </div>
                  </Button>

                  {/* Preview PDF - works even with 0€ */}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14 border-secondary/50 hover:bg-secondary/10"
                    onClick={handlePreviewPdf}
                    disabled={!linkedPresupuesto || isPreviewingPdf}
                  >
                    {isPreviewingPdf ? (
                      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                    ) : (
                      <Eye className="w-5 h-5 text-secondary" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Ver Borrador PDF</p>
                      <p className="text-xs text-muted-foreground">Previsualizar documento actual</p>
                    </div>
                  </Button>

                  <Button
                    className="w-full justify-start gap-3 h-14 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleSendPresupuesto}
                    disabled={!linkedPresupuesto || linkedPresupuesto.subtotal === 0 || isSendingPresupuesto}
                  >
                    {isSendingPresupuesto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Enviar Presupuesto</p>
                      <p className="text-xs opacity-80">Genera PDF y envía al cliente</p>
                    </div>
                  </Button>

                  {linkedPresupuesto?.pdf_url && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={handleDownloadPdf}
                    >
                      <Download className="w-5 h-5 text-secondary" />
                      <div className="text-left">
                        <p className="font-medium">Descargar PDF</p>
                        <p className="text-xs text-muted-foreground">Ver documento generado</p>
                      </div>
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handleRequestReview}
            >
              <Star className="w-5 h-5 text-warning" />
              <div className="text-left">
                <p className="font-medium">Solicitar Reseña Google</p>
                <p className="text-xs text-muted-foreground">Enviar por WhatsApp</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => openWhatsApp(`Hola ${client?.name}, te escribo sobre el trabajo "${work.title}"...`)}
            >
              <MessageSquare className="w-5 h-5 text-secondary" />
              <div className="text-left">
                <p className="font-medium">Contactar por WhatsApp</p>
                <p className="text-xs text-muted-foreground">Abrir conversación</p>
              </div>
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

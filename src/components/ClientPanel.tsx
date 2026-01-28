import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkWithClient, Client } from '@/types/database';
import { useWorks } from '@/hooks/useWorks';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useEmpresa } from '@/hooks/useEmpresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import { DeleteWorkDialog } from '@/components/DeleteWorkDialog';
import { ImageUpload } from '@/components/ImageUpload';
import { 
  Phone, 
  Mail, 
  Building2, 
  MessageSquare, 
  Star,
  Euro,
  Calendar,
  CheckCircle,
  X,
  Edit,
  Send,
  Download,
  Loader2,
  Eye,
  AlertCircle,
  Trash2,
  Wallet,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generatePresupuestoPdf, downloadPdf } from '@/lib/pdfGenerator';

interface ClientPanelProps {
  work: WorkWithClient | null;
  allWorks: WorkWithClient[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateWork: (updates: Partial<WorkWithClient> & { id: string }) => void;
}

export function ClientPanel({ work, allWorks, isOpen, onClose, onUpdateWork }: ClientPanelProps) {
  const navigate = useNavigate();
  const { markAsPaid, updateWorkStatus, deleteWork, updateAdvancePayment, updateWork } = useWorks();
  const { presupuestos, isLoading: presupuestosLoading, updatePresupuesto, deletePresupuesto } = usePresupuestos();
  const { empresa, isEmpresaComplete } = useEmpresa();
  const [editedWork, setEditedWork] = useState<Partial<WorkWithClient>>({});
  const [isSendingPresupuesto, setIsSendingPresupuesto] = useState(false);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const linkedPresupuesto = presupuestos.find(p => p.work_id === work.id);
  const isInvoiced = work.status === 'factura_enviada' || work.status === 'cobrado';
  const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);

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

  const openEmail = () => {
    if (!client?.email) {
      toast.error('El cliente no tiene email');
      return;
    }
    window.open(`mailto:${client.email}`, '_blank');
  };

  const handleEditPresupuesto = async () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa primero');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }

    // Pass workId so we can return to this work's detail view
    if (linkedPresupuesto) {
      navigate(`/presupuesto/${linkedPresupuesto.id}`, { state: { returnToWorkId: work.id } });
    } else {
      navigate('/presupuesto/nuevo', { state: { workId: work.id, client, returnToWorkId: work.id } });
    }
    onClose();
  };

  const handleDeleteWork = async () => {
    setIsDeleting(true);
    try {
      if (linkedPresupuesto && deletePresupuesto) {
        await deletePresupuesto.mutateAsync(linkedPresupuesto.id);
      }
      await deleteWork.mutateAsync(work.id);
      onClose();
    } catch (error) {
      console.error('Error deleting work:', error);
      toast.error('Error al eliminar el trabajo');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!isEmpresaComplete || !empresa) {
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
      const blob = await generatePresupuestoPdf({
        presupuesto: linkedPresupuesto,
        empresa,
        subtotal: linkedPresupuesto.subtotal,
        iva_importe: linkedPresupuesto.iva_importe,
        total: linkedPresupuesto.total_presupuesto,
      });
      
      setPdfBlob(blob);
      setPdfModalOpen(true);
      toast.success('PDF generado correctamente');
    } catch (error: any) {
      console.error('Error generating preview PDF:', error);
      toast.error('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsPreviewingPdf(false);
    }
  };

  const handleSendPresupuesto = async () => {
    if (!isEmpresaComplete || !empresa) {
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
      const blob = await generatePresupuestoPdf({
        presupuesto: linkedPresupuesto,
        empresa,
        subtotal: linkedPresupuesto.subtotal,
        iva_importe: linkedPresupuesto.iva_importe,
        total: linkedPresupuesto.total_presupuesto,
      });

      await updatePresupuesto.mutateAsync({
        id: linkedPresupuesto.id,
        estado_presupuesto: 'enviado',
      });

      updateWorkStatus.mutate({ 
        id: work.id, 
        status: 'presupuesto_enviado',
        position: work.position 
      });

      toast.success('Presupuesto enviado correctamente');
      
      const filename = `Presupuesto-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf`;
      downloadPdf(blob, filename);

      if (client?.phone) {
        const message = `Hola ${client.name}, te envío el presupuesto para "${work.title}". Te acabo de enviar el archivo PDF.`;
        openWhatsApp(message);
      }
    } catch (error: any) {
      console.error('Error sending presupuesto:', error);
      toast.error('Error al enviar presupuesto: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSendingPresupuesto(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!linkedPresupuesto || !empresa) {
      toast.error('No hay presupuesto disponible');
      return;
    }
    
    try {
      const blob = await generatePresupuestoPdf({
        presupuesto: linkedPresupuesto,
        empresa,
        subtotal: linkedPresupuesto.subtotal,
        iva_importe: linkedPresupuesto.iva_importe,
        total: linkedPresupuesto.total_presupuesto,
      });
      
      const filename = `Presupuesto-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf`;
      downloadPdf(blob, filename);
      toast.success('PDF descargado correctamente');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar el PDF');
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

  const handleAddAdvance = () => {
    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }

    const newTotal = Number(work.advance_payments || 0) + amount;
    if (newTotal > Number(work.amount)) {
      toast.error('El anticipo no puede superar el total');
      return;
    }

    updateAdvancePayment.mutate({ id: work.id, advance_payments: newTotal });
    setAdvanceAmount('');
  };

  const handleImagesChange = (images: string[]) => {
    updateWork.mutate({ id: work.id, images });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold text-foreground">
                {client?.company || client?.name || 'Cliente'}
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {client?.company && client?.name && (
              <p className="text-sm text-muted-foreground">{client.name}</p>
            )}
            <p className="font-medium text-foreground mt-2">{work.title}</p>
          </SheetHeader>

          <Tabs defaultValue="contact" className="mt-4">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="contact">Contacto</TabsTrigger>
              <TabsTrigger value="finances">Finanzas</TabsTrigger>
              <TabsTrigger value="presupuesto">
                {isInvoiced ? 'Factura' : 'Presupuesto'}
              </TabsTrigger>
              <TabsTrigger value="actions">Acciones</TabsTrigger>
            </TabsList>

            <TabsContent value="contact" className="space-y-4 mt-4">
              {/* Contact Info */}
              <div className="space-y-3">
                {client?.email && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">{client.email}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={openEmail}>
                      Enviar
                    </Button>
                  </div>
                )}
                
                {client?.phone && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">{client.phone}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => openWhatsApp()}>
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                      </Button>
                    </div>
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

              {/* Images */}
              <div className="space-y-2">
                <ImageUpload
                  images={work.images || []}
                  onImagesChange={handleImagesChange}
                  maxImages={5}
                  disabled={isInvoiced}
                />
              </div>
            </TabsContent>

            <TabsContent value="finances" className="space-y-4 mt-4">
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
                    <Label className="text-xs text-muted-foreground">Total Presupuesto</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Euro className="w-4 h-4 text-primary" />
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={editedWork.amount ?? work.amount}
                        onChange={(e) => setEditedWork({ ...editedWork, amount: parseFloat(e.target.value) })}
                        className="bg-muted border-border h-12"
                        disabled={isInvoiced}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Nº Factura</Label>
                    <Input
                      value={editedWork.invoice_number ?? work.invoice_number ?? ''}
                      onChange={(e) => setEditedWork({ ...editedWork, invoice_number: e.target.value })}
                      placeholder="FAC-001"
                      className="bg-muted border-border mt-1 h-12"
                      disabled={isInvoiced}
                    />
                  </div>
                </div>

                {/* Advance Payments Section - Only for En Obra */}
                {work.status === 'presupuesto_aceptado' && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-emerald-500">Anticipos</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <span className="ml-2 font-medium">{formatCurrency(Number(work.amount))}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Anticipos:</span>
                        <span className="ml-2 font-medium text-emerald-500">
                          {formatCurrency(Number(work.advance_payments || 0))}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Pendiente:</span>
                        <span className="ml-2 font-bold text-lg">{formatCurrency(pendingAmount)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        placeholder="Importe anticipo"
                        className="bg-background border-border h-10"
                      />
                      <Button size="sm" onClick={handleAddAdvance} className="h-10">
                        Añadir
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <Input
                      type="date"
                      value={editedWork.due_date ?? work.due_date ?? ''}
                      onChange={(e) => setEditedWork({ ...editedWork, due_date: e.target.value })}
                      className="bg-muted border-border h-12"
                    />
                  </div>
                </div>

                {Object.keys(editedWork).length > 0 && (
                  <Button onClick={handleSave} className="w-full h-12">Guardar Cambios</Button>
                )}
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Estado de Pago</p>
                    <p className={`text-xs ${work.is_paid ? 'text-secondary' : 'text-warning'}`}>
                      {work.is_paid ? 'Cobrado' : 'Pendiente de cobro'}
                    </p>
                  </div>
                  {!work.is_paid && work.status === 'factura_enviada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-secondary text-secondary hover:bg-secondary/10 h-12"
                      onClick={handleMarkAsPaid}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar Cobrado
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="presupuesto" className="space-y-4 mt-4">
              {presupuestosLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Cargando...</span>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isInvoiced ? 'Estado de la Factura' : 'Estado del Presupuesto'}
                        </p>
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
                            : linkedPresupuesto.estado_presupuesto === 'facturado'
                            ? 'bg-purple-500/20 text-purple-500'
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
                          No hay presupuesto vinculado. Pulsa "Editar" para crear uno.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-3">
                    {!isInvoiced && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-14"
                        onClick={handleEditPresupuesto}
                      >
                        <Edit className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <p className="font-medium">Editar Presupuesto</p>
                          <p className="text-xs text-muted-foreground">
                            {linkedPresupuesto ? 'Modificar partidas' : 'Crear nuevo'}
                          </p>
                        </div>
                      </Button>
                    )}

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
                        <p className="font-medium">Ver PDF</p>
                        <p className="text-xs text-muted-foreground">Vista previa</p>
                      </div>
                    </Button>

                    {!isInvoiced && (
                      <Button
                        className="w-full justify-start gap-3 h-14 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={handleSendPresupuesto}
                        disabled={!linkedPresupuesto || isSendingPresupuesto}
                      >
                        {isSendingPresupuesto ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                        <div className="text-left">
                          <p className="font-medium">Enviar Presupuesto</p>
                          <p className="text-xs opacity-80">Genera PDF y envía</p>
                        </div>
                      </Button>
                    )}

                    {linkedPresupuesto && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3 h-14"
                        onClick={handleDownloadPdf}
                      >
                        <Download className="w-5 h-5 text-secondary" />
                        <div className="text-left">
                          <p className="font-medium">Descargar PDF</p>
                          <p className="text-xs text-muted-foreground">Guardar documento</p>
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
                className="w-full justify-start gap-3 h-14"
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
                className="w-full justify-start gap-3 h-14"
                onClick={() => openWhatsApp(`Hola ${client?.name}, te escribo sobre el trabajo "${work.title}"...`)}
              >
                <MessageSquare className="w-5 h-5 text-secondary" />
                <div className="text-left">
                  <p className="font-medium">Contactar por WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Abrir conversación</p>
                </div>
              </Button>

              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-14 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium">Eliminar Trabajo</p>
                    <p className="text-xs opacity-80">Borra trabajo y presupuesto</p>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <PdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => {
          setPdfModalOpen(false);
          setPdfBlob(null);
        }}
        pdfBlob={pdfBlob}
        fileName={linkedPresupuesto ? `Presupuesto-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf` : 'presupuesto.pdf'}
        clientPhone={client?.phone}
        clientName={client?.name}
        presupuestoTitle={work.title}
      />

      <DeleteWorkDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteWork}
        workTitle={work.title}
        isDeleting={isDeleting}
      />
    </>
  );
}

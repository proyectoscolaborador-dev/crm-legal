import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkWithClient, WorkStatus } from '@/types/database';
import { useWorks } from '@/hooks/useWorks';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft,
  Edit,
  Eye,
  Download,
  MessageSquare,
  Mail,
  Phone,
  Loader2,
  Euro,
  CheckCircle,
  AlertTriangle,
  Flag,
  Receipt,
  Wallet,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { generatePresupuestoPdf, downloadPdf } from '@/lib/pdfGenerator';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkDetailViewProps {
  work: WorkWithClient;
  onClose: () => void;
  onStatusChange: (workId: string, status: WorkStatus) => void;
  onMarkAsPaid: (workId: string) => void;
}

export function WorkDetailView({ work, onClose, onStatusChange, onMarkAsPaid }: WorkDetailViewProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { updateAdvancePayment, updateWorkStatus } = useWorks();
  const { presupuestos, updatePresupuesto } = usePresupuestos();
  const { empresa, isEmpresaComplete } = useEmpresa();
  
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'finish' | 'paid' | null>(null);

  const client = work.client;
  const linkedPresupuesto = presupuestos.find(p => p.work_id === work.id);
  
  // Calculate amounts
  const subtotal = linkedPresupuesto?.subtotal || Number(work.amount) / 1.21;
  const ivaImporte = linkedPresupuesto?.iva_importe || Number(work.amount) - subtotal;
  const total = linkedPresupuesto?.total_presupuesto || Number(work.amount);
  const advancePayments = Number(work.advance_payments || 0);
  const pendingAmount = total - advancePayments;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Determine phase based on status
  const getPhase = () => {
    switch (work.status) {
      case 'presupuesto_solicitado':
        return 'draft';
      case 'presupuesto_enviado':
        return 'sent';
      case 'presupuesto_aceptado':
        return 'inProgress';
      case 'pendiente_facturar':
        return 'pendingInvoice';
      case 'factura_enviada':
        return 'invoiced';
      case 'cobrado':
        return 'paid';
      default:
        return 'draft';
    }
  };

  const phase = getPhase();

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

  const handleEditPresupuesto = () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa primero');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }

    if (linkedPresupuesto) {
      navigate(`/presupuesto/${linkedPresupuesto.id}`);
    } else {
      navigate('/presupuesto/nuevo', { state: { workId: work.id, client } });
    }
  };

  const handlePreviewPdf = async () => {
    if (!isEmpresaComplete || !empresa) {
      toast.error('Debes completar los datos de tu empresa primero');
      return;
    }

    if (!linkedPresupuesto) {
      toast.error('No hay presupuesto asociado');
      return;
    }

    setIsGeneratingPdf(true);
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
    } catch (error) {
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!linkedPresupuesto || !empresa) {
      toast.error('No hay presupuesto disponible');
      return;
    }
    
    setIsGeneratingPdf(true);
    try {
      const isInvoice = phase === 'invoiced' || phase === 'paid';
      const blob = await generatePresupuestoPdf({
        presupuesto: linkedPresupuesto,
        empresa,
        subtotal: linkedPresupuesto.subtotal,
        iva_importe: linkedPresupuesto.iva_importe,
        total: linkedPresupuesto.total_presupuesto,
        documentType: isInvoice ? 'factura' : 'presupuesto',
      });
      
      const prefix = isInvoice ? 'Factura' : 'Presupuesto';
      const filename = `${prefix}-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf`;
      downloadPdf(blob, filename);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendBudget = async () => {
    if (!linkedPresupuesto || !empresa) return;
    
    setIsGeneratingPdf(true);
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

      const filename = `Presupuesto-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf`;
      downloadPdf(blob, filename);

      if (client?.phone) {
        const message = `Hola ${client.name}, te envío el presupuesto para "${work.title}".`;
        openWhatsApp(message);
      }

      toast.success('Presupuesto enviado');
    } catch (error) {
      toast.error('Error al enviar');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleAcceptBudget = () => {
    onStatusChange(work.id, 'presupuesto_aceptado');
    toast.success('¡Presupuesto aceptado! Pasando a En Obra...');
  };

  const handleRejectBudget = () => {
    // Could add confirmation dialog here
    onStatusChange(work.id, 'presupuesto_solicitado'); // Or delete
    toast.info('Presupuesto rechazado');
  };

  const handleAddAdvance = () => {
    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }

    const newTotal = advancePayments + amount;
    if (newTotal > total) {
      toast.error('El anticipo no puede superar el total');
      return;
    }

    updateAdvancePayment.mutate({ id: work.id, advance_payments: newTotal });
    setAdvanceAmount('');
    toast.success('Anticipo registrado');
  };

  const handleWorkFinished = () => {
    setConfirmDialog('finish');
  };

  const confirmWorkFinished = async () => {
    // Move to pending invoice first
    onStatusChange(work.id, 'pendiente_facturar');
    toast.success('Trabajo terminado. Pendiente de facturar.');
    setConfirmDialog(null);
  };

  const handleRegisterPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Introduce un importe válido');
      return;
    }

    const newTotal = advancePayments + amount;
    updateAdvancePayment.mutate({ id: work.id, advance_payments: newTotal });
    setPaymentAmount('');

    // Check if fully paid
    if (newTotal >= total) {
      onMarkAsPaid(work.id);
      toast.success('¡Factura cobrada completamente!');
    } else {
      toast.success('Cobro registrado');
    }
  };

  const handleMarkFullyPaid = () => {
    setConfirmDialog('paid');
  };

  const confirmMarkFullyPaid = () => {
    updateAdvancePayment.mutate({ id: work.id, advance_payments: total });
    onMarkAsPaid(work.id);
    toast.success('¡Factura cobrada completamente!');
    setConfirmDialog(null);
  };

  // Get work image or placeholder
  const workImage = work.images && work.images.length > 0 ? work.images[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Back Button - Always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border border-border"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Layout - Split on desktop, stacked on mobile */}
      <div className={`h-full ${isMobile ? 'flex flex-col' : 'flex'}`}>
        {/* Left Side - Image */}
        <div className={`relative ${isMobile ? 'h-48' : 'w-1/2 h-full'} bg-muted`}>
          {workImage ? (
            <img 
              src={workImage} 
              alt={work.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                  <Receipt className="w-8 h-8" />
                </div>
                <p className="text-sm">Sin imagen</p>
              </div>
            </div>
          )}
          
          {/* Overlay with title */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background/90 to-transparent">
            <h1 className="text-2xl font-bold text-foreground mb-1">{work.title}</h1>
            <p className="text-muted-foreground">{client?.company || client?.name}</p>
          </div>
        </div>

        {/* Right Side - Management Column */}
        <div className={`${isMobile ? 'flex-1' : 'w-1/2'} overflow-y-auto p-6 space-y-6`}>
          {/* 1. Header - Client Name */}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {client?.company || client?.name || 'Sin cliente'}
            </h2>
            {client?.company && client?.name && (
              <p className="text-muted-foreground">{client.name}</p>
            )}
          </div>

          {/* 2. Money Card - Dynamic based on phase */}
          {phase === 'draft' || phase === 'sent' ? (
            <div className="p-5 rounded-xl bg-primary/10 border border-primary/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">IVA (21%)</span>
                <span className="font-medium">{formatCurrency(ivaImporte)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-primary/30">
                <span className="text-lg font-semibold text-primary">TOTAL</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          ) : phase === 'inProgress' || phase === 'pendingInvoice' ? (
            <div className="p-5 rounded-xl bg-warning/10 border border-warning/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Presupuesto</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between items-center text-success">
                <span>Anticipos Recibidos</span>
                <span className="font-medium">{formatCurrency(advancePayments)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-warning/30">
                <span className="text-lg font-semibold text-warning">PENDIENTE</span>
                <span className="text-2xl font-bold text-warning">{formatCurrency(pendingAmount)}</span>
              </div>
              
              {/* Add Advance Button */}
              <div className="flex gap-2 pt-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="Importe"
                  className="bg-background border-border"
                />
                <Button size="sm" onClick={handleAddAdvance} className="gap-1 whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  Anticipo
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border space-y-3" style={{
              backgroundColor: pendingAmount <= 0 ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
              borderColor: pendingAmount <= 0 ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)',
            }}>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">TOTAL FACTURA</span>
                <span className="font-bold text-lg">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-success">COBRADO</span>
                <span className="font-medium text-success">{formatCurrency(advancePayments)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t" style={{
                borderColor: pendingAmount <= 0 ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--destructive) / 0.3)',
              }}>
                <span className={`text-lg font-semibold ${pendingAmount <= 0 ? 'text-success' : 'text-destructive'}`}>
                  PENDIENTE
                </span>
                <span className={`text-2xl font-bold ${pendingAmount <= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(Math.max(0, pendingAmount))}
                </span>
              </div>
              
              {/* Register Payment */}
              {pendingAmount > 0 && (
                <div className="flex gap-2 pt-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Importe cobro"
                    className="bg-background border-border"
                  />
                  <Button size="sm" onClick={handleRegisterPayment} className="gap-1 whitespace-nowrap bg-success hover:bg-success/90">
                    <Plus className="w-4 h-4" />
                    Cobro
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. Main Action Button - Based on phase */}
          {phase === 'draft' && (
            <Button 
              className="w-full h-14 text-lg gap-2 bg-primary hover:bg-primary/90"
              onClick={handleEditPresupuesto}
            >
              <Edit className="w-5 h-5" />
              ✏️ EDITAR PRESUPUESTO
            </Button>
          )}

          {phase === 'sent' && (
            <div className="space-y-3">
              <Button 
                className="w-full h-14 text-lg gap-2 bg-success hover:bg-success/90"
                onClick={handleAcceptBudget}
              >
                <CheckCircle className="w-5 h-5" />
                ✅ ACEPTAR PRESUPUESTO
              </Button>
              <Button 
                variant="destructive"
                className="w-full h-12 gap-2"
                onClick={handleRejectBudget}
              >
                ❌ RECHAZAR PRESUPUESTO
              </Button>
            </div>
          )}

          {phase === 'inProgress' && (
            <Button 
              className="w-full h-14 text-lg gap-2 bg-warning hover:bg-warning/90 text-warning-foreground"
              onClick={handleWorkFinished}
            >
              <Flag className="w-5 h-5" />
              👷‍♂️ TRABAJO TERMINADO
            </Button>
          )}

          {phase === 'pendingInvoice' && (
            <Button 
              className="w-full h-14 text-lg gap-2 bg-purple-500 hover:bg-purple-600"
              onClick={() => onStatusChange(work.id, 'factura_enviada')}
            >
              <Receipt className="w-5 h-5" />
              📄 EMITIR FACTURA
            </Button>
          )}

          {phase === 'invoiced' && pendingAmount > 0 && (
            <Button 
              className="w-full h-14 text-lg gap-2 bg-success hover:bg-success/90"
              onClick={handleMarkFullyPaid}
            >
              <Wallet className="w-5 h-5" />
              💸 REGISTRAR COBRO TOTAL
            </Button>
          )}

          {phase === 'paid' && (
            <div className="p-4 rounded-xl bg-success/20 border border-success/30 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-success" />
              <span className="font-medium text-success">Factura cobrada completamente</span>
            </div>
          )}

          {/* 4. Tools Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Herramientas
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handlePreviewPdf}
                disabled={isGeneratingPdf || !linkedPresupuesto}
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Previsualizar
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || !linkedPresupuesto}
              >
                <Download className="w-4 h-4" />
                Descargar
              </Button>
            </div>

            {(phase === 'draft' || phase === 'inProgress') && (
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleEditPresupuesto}
              >
                <Edit className="w-4 h-4" />
                Editar Presupuesto
              </Button>
            )}

            {phase === 'draft' && (
              <Button 
                className="w-full gap-2 bg-secondary hover:bg-secondary/90"
                onClick={handleSendBudget}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Enviar por WhatsApp
              </Button>
            )}
          </div>

          {/* 5. Contact Section */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Contacto
            </h3>
            
            <div className="flex flex-wrap gap-2">
              {client?.phone && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => openWhatsApp()}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(`tel:${client.phone}`)}
                  >
                    <Phone className="w-4 h-4" />
                    Llamar
                  </Button>
                </>
              )}
              {client?.email && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                  onClick={openEmail}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfBlob={pdfBlob}
        fileName={linkedPresupuesto ? `Presupuesto-${linkedPresupuesto.numero_presupuesto.replace(/\//g, '-')}.pdf` : 'documento.pdf'}
        clientPhone={client?.phone}
        clientName={client?.name}
        presupuestoTitle={work.title}
      />

      {/* Confirmation Dialog - Work Finished */}
      <AlertDialog open={confirmDialog === 'finish'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              ¿Confirmar trabajo terminado?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El trabajo pasará a "Pendiente de Facturar". Podrás revisar las cantidades finales antes de emitir la factura definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWorkFinished} className="bg-warning hover:bg-warning/90 text-warning-foreground">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Mark as Paid */}
      <AlertDialog open={confirmDialog === 'paid'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-success" />
              ¿Marcar como cobrada?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se registrará el cobro total de {formatCurrency(pendingAmount)} y el trabajo pasará al historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkFullyPaid} className="bg-success hover:bg-success/90">
              Confirmar Cobro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

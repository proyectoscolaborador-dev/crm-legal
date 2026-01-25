import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, MessageSquare, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  fileName: string;
  clientPhone?: string | null;
  clientName?: string;
  presupuestoTitle?: string;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfBlob,
  fileName,
  clientPhone,
  clientName,
  presupuestoTitle,
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return () => {};
  }, [pdfBlob]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('PDF descargado correctamente');
  };

  const handleWhatsApp = () => {
    if (!clientPhone) {
      toast.error('El cliente no tiene número de teléfono');
      return;
    }
    const phone = clientPhone.replace(/\D/g, '');
    const message = `Hola${clientName ? ` ${clientName}` : ''}, te envío el presupuesto${presupuestoTitle ? ` para "${presupuestoTitle}"` : ''}. Por favor revísalo y me comentas cualquier duda.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-card border-border">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">Vista Previa del Presupuesto</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Vista previa PDF"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex-shrink-0 flex gap-3 justify-end bg-card">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!pdfBlob}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button
            onClick={handleWhatsApp}
            disabled={!clientPhone}
            className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <MessageSquare className="h-4 w-4" />
            Enviar por WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

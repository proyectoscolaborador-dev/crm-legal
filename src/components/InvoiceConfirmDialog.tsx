import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FileText, X } from 'lucide-react';

interface InvoiceConfirmDialogProps {
  isOpen: boolean;
  onConfirm: (generateInvoice: boolean) => void;
  onCancel: () => void;
  workTitle: string;
  clientName: string;
}

export function InvoiceConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  workTitle,
  clientName,
}: InvoiceConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mover a Facturación
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Estás moviendo el trabajo <strong>"{workTitle}"</strong> de <strong>{clientName}</strong> a la columna de Facturación.
            </p>
            <p className="text-foreground font-medium">
              ¿Deseas generar la factura definitiva ahora?
            </p>
            <p className="text-xs text-muted-foreground">
              Al generar la factura, se asignará un número de factura y los precios quedarán bloqueados.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </AlertDialogCancel>
          <Button 
            variant="outline" 
            onClick={() => onConfirm(false)}
            className="gap-2"
          >
            Solo Mover
          </Button>
          <AlertDialogAction 
            onClick={() => onConfirm(true)}
            className="gap-2 bg-primary text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            Generar Factura
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

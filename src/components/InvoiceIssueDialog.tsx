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
import { FileText, Lock, AlertTriangle } from 'lucide-react';

interface InvoiceIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workTitle?: string;
  total?: string;
  isProcessing?: boolean;
}

export function InvoiceIssueDialog({
  isOpen,
  onClose,
  onConfirm,
  workTitle,
  total,
  isProcessing = false,
}: InvoiceIssueDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Emitir factura definitiva
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground pt-2 space-y-3">
            {workTitle && (
              <span className="font-medium text-foreground block text-base">
                "{workTitle}"
              </span>
            )}
            {total && (
              <span className="font-bold text-primary text-lg block">
                Total: {total}
              </span>
            )}
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">¿Generar factura legal?</p>
                <p className="text-sm">Esta acción es <strong>irreversible</strong>:</p>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  <li>Se asignará un número de factura automático</li>
                  <li>Los importes quedarán bloqueados permanentemente</li>
                  <li>El documento pasará de "Presupuesto" a "Factura"</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">No podrás editar los datos después de facturar</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel 
            className="border-border"
            disabled={isProcessing}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2"
            disabled={isProcessing}
          >
            <FileText className="h-4 w-4" />
            {isProcessing ? 'Generando factura...' : 'Sí, emitir factura'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

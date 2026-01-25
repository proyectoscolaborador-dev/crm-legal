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
import { X, Archive, Trash2 } from 'lucide-react';

interface RejectConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
  workTitle?: string;
  isDeleting?: boolean;
}

export function RejectConfirmDialog({
  isOpen,
  onClose,
  onArchive,
  onDelete,
  workTitle,
  isDeleting = false,
}: RejectConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-foreground">
              Rechazar presupuesto
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground pt-2 space-y-2">
            {workTitle && (
              <span className="font-medium text-foreground block">
                "{workTitle}"
              </span>
            )}
            <p>¿Qué deseas hacer con este trabajo rechazado?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            className="border-border"
            disabled={isDeleting}
          >
            Cancelar
          </AlertDialogCancel>
          <Button 
            variant="outline" 
            onClick={onArchive}
            disabled={isDeleting}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            Solo marcar como rechazado
          </Button>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Eliminando...' : 'Eliminar trabajo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

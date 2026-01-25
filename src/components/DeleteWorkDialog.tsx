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
import { Trash2 } from 'lucide-react';

interface DeleteWorkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workTitle?: string;
  isDeleting?: boolean;
}

export function DeleteWorkDialog({
  isOpen,
  onClose,
  onConfirm,
  workTitle,
  isDeleting = false,
}: DeleteWorkDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-foreground">
              ¿Eliminar este trabajo?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground pt-2">
            {workTitle && (
              <span className="font-medium text-foreground block mb-2">
                "{workTitle}"
              </span>
            )}
            <strong className="text-destructive">Esta acción no se puede deshacer.</strong>
            <br />
            Se eliminará el trabajo junto con el presupuesto asociado y toda la información relacionada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel 
            className="border-border"
            disabled={isDeleting}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar trabajo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
import { MessageSquare, Mail, Send } from 'lucide-react';

interface SendConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'whatsapp' | 'email';
  clientName?: string;
  presupuestoTitle?: string;
}

export function SendConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  clientName,
  presupuestoTitle
}: SendConfirmDialogProps) {
  const Icon = type === 'whatsapp' ? MessageSquare : Mail;
  const typeName = type === 'whatsapp' ? 'WhatsApp' : 'Email';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${type === 'whatsapp' ? 'text-emerald-500' : 'text-primary'}`} />
            Confirmar Envío por {typeName}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              ¿El presupuesto <strong>"{presupuestoTitle}"</strong> está listo para enviar a <strong>{clientName}</strong>?
            </p>
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning font-medium">
                ⚠️ Al enviar, el presupuesto pasará a "Enviado" y esperará la respuesta del cliente.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={type === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
          >
            <Send className="w-4 h-4 mr-2" />
            Confirmar y Enviar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

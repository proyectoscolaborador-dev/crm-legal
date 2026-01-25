import { Button } from '@/components/ui/button';
import { WorkStatus } from '@/types/database';
import { 
  Check, 
  X, 
  Flag, 
  FileText, 
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Mapping between presupuesto estado and work status
export type PresupuestoEstado = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'en_proceso' | 'terminado' | 'facturado';

export type WorkflowPhase = 'commercial' | 'execution' | 'adjustment' | 'invoiced';

export function getWorkflowPhase(estado: PresupuestoEstado): WorkflowPhase {
  switch (estado) {
    case 'borrador':
    case 'enviado':
      return 'commercial';
    case 'aceptado':
    case 'en_proceso':
      return 'execution';
    case 'terminado':
      return 'adjustment';
    case 'facturado':
    case 'rechazado':
      return 'invoiced';
    default:
      return 'commercial';
  }
}

interface WorkflowActionBarProps {
  estado: PresupuestoEstado;
  onAccept: () => void;
  onReject: () => void;
  onWorkCompleted: () => void;
  onIssueInvoice: () => void;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export function WorkflowActionBar({
  estado,
  onAccept,
  onReject,
  onWorkCompleted,
  onIssueInvoice,
  isLoading = false,
  isReadOnly = false,
}: WorkflowActionBarProps) {
  const phase = getWorkflowPhase(estado);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Phase 4: Invoiced - show locked status
  if (phase === 'invoiced' && estado === 'facturado') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-success/10 border border-success/30 rounded-lg">
        <Check className="h-5 w-5 text-success" />
        <span className="font-medium text-success">Factura emitida - Documento bloqueado</span>
      </div>
    );
  }

  // Phase: Rejected
  if (estado === 'rechazado') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <X className="h-5 w-5 text-destructive" />
        <span className="font-medium text-destructive">Presupuesto rechazado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-3">
      {/* Phase 1: Commercial (Borrador, Enviado) */}
      {phase === 'commercial' && (
        <>
          <Button
            type="button"
            onClick={onAccept}
            disabled={false}
            className="flex-1 h-12 gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold text-base"
          >
            <Check className="h-5 w-5" />
            ✅ ACEPTAR PRESUPUESTO
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onReject}
            disabled={false}
            className="flex-1 h-12 gap-2 border-destructive text-destructive hover:bg-destructive/10 font-semibold text-base"
          >
            <X className="h-5 w-5" />
            ❌ RECHAZAR
          </Button>
        </>
      )}

      {/* Phase 2: Execution (Aceptado, En Proceso) */}
      {phase === 'execution' && (
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm text-muted-foreground">Trabajo en curso. Completa la obra para proceder a facturación.</span>
          </div>
          <Button
            type="button"
            onClick={onWorkCompleted}
            disabled={false}
            className="w-full h-14 gap-3 bg-warning hover:bg-warning/90 text-warning-foreground font-bold text-lg"
          >
            <Flag className="h-6 w-6" />
            🏁 TRABAJO REALIZADO
          </Button>
        </div>
      )}

      {/* Phase 3: Adjustment (Terminado - ready for final invoice) */}
      {phase === 'adjustment' && (
        <div className="w-full space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Revisa y ajusta las cantidades finales antes de emitir la factura.</span>
          </div>
          <Button
            type="button"
            onClick={onIssueInvoice}
            disabled={false}
            className="w-full h-14 gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-lg"
          >
            <FileText className="h-6 w-6" />
            📄 EMITIR FACTURA DEFINITIVA
          </Button>
        </div>
      )}
    </div>
  );
}
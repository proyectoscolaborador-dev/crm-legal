import { useState } from 'react';
import { WorkWithClient, WorkStatus, STAGE_CONFIG } from '@/types/database';
import { ChevronDown, ChevronUp, PlusCircle, Send, HardHat, FileText, Receipt, CheckCircle, Wallet, Clock } from 'lucide-react';
import { CompactWorkList } from './CompactWorkList';

interface StageSectionProps {
  status: WorkStatus;
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
  onDeleteClick?: (workId: string) => void;
}

const STAGE_ICONS: Record<WorkStatus, React.ReactNode> = {
  presupuesto_solicitado: <PlusCircle className="w-5 h-5" />,
  presupuesto_enviado: <Send className="w-5 h-5" />,
  presupuesto_aceptado: <HardHat className="w-5 h-5" />,
  pendiente_facturar: <Clock className="w-5 h-5" />,
  factura_enviada: <Receipt className="w-5 h-5" />,
  trabajo_terminado: <CheckCircle className="w-5 h-5" />,
  cobrado: <Wallet className="w-5 h-5" />,
};

export function StageSection({ status, works, onWorkClick, onDeleteClick }: StageSectionProps) {
  // Always start collapsed
  const [isExpanded, setIsExpanded] = useState(false);
  const config = STAGE_CONFIG[status];
  const totalAmount = works.reduce((sum, w) => sum + Number(w.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Stage Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-4 flex items-center justify-between transition-colors ${config.bgColor}`}
      >
        <div className="flex items-center gap-3">
          <span className={config.color}>{STAGE_ICONS[status]}</span>
          <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
          <span className="px-2 py-0.5 rounded-full bg-background/50 text-sm font-medium">
            {works.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {works.length > 0 && (
            <span className={`font-semibold ${config.color}`}>
              {formatCurrency(totalAmount)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Works List - Compact */}
      {isExpanded && (
        <div className="bg-background/50">
          <CompactWorkList works={works} onWorkClick={onWorkClick} onDeleteClick={onDeleteClick} />
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { WorkWithClient } from '@/types/database';
import { CompactWorkList } from './CompactWorkList';
import { Card, CardContent } from '@/components/ui/card';
import { Archive, Euro, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HistorySectionProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

export function HistorySection({ works, onWorkClick }: HistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Filter for completed/paid works
  const historyWorks = works.filter(w => 
    w.status === 'cobrado' || 
    w.status === 'trabajo_terminado' ||
    w.is_paid
  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const totalCobrado = historyWorks.reduce((sum, w) => sum + Number(w.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-success/10 border-success/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Euro className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Facturado</p>
                <p className="text-xl font-bold text-success">{formatCurrency(totalCobrado)}</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1 border-success/30 text-success">
              <Archive className="h-3 w-3" />
              {historyWorks.length} trabajos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between transition-colors bg-muted/50 hover:bg-muted/70"
        >
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Histórico</h3>
            <span className="px-2 py-0.5 rounded-full bg-background/50 text-sm font-medium">
              {historyWorks.length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-success">
              {formatCurrency(totalCobrado)}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="bg-background/50">
            {historyWorks.length > 0 ? (
              <CompactWorkList works={historyWorks} onWorkClick={onWorkClick} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin trabajos completados</p>
                <p className="text-xs mt-1">Los trabajos cobrados aparecerán aquí</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

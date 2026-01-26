import { WorkWithClient, WorkStatus, STAGE_CONFIG } from '@/types/database';
import { Building2, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompactWorkListProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
  onDeleteClick?: (workId: string) => void;
}

export function CompactWorkList({ works, onWorkClick, onDeleteClick }: CompactWorkListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (works.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">No hay datos</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {works.map(work => {
        const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);
        const hasAdvances = Number(work.advance_payments || 0) > 0;
        
        return (
          <div
            key={work.id}
            className="flex items-center group hover:bg-muted/50 transition-colors"
          >
            {/* Delete Button */}
            {onDeleteClick && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(work.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            <button
              onClick={() => onWorkClick(work)}
              className="flex-1 flex items-center justify-between p-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Company/Client */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {work.client?.company && (
                      <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                    <span className="font-medium text-foreground truncate">
                      {work.client?.company || work.client?.name || 'Sin cliente'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{work.title}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatCurrency(Number(work.amount))}
                  </p>
                  {hasAdvances && (
                    <p className="text-xs text-muted-foreground">
                      Pend: {formatCurrency(pendingAmount)}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

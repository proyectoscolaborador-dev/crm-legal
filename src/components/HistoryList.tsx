import { WorkWithClient } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryListProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

export function HistoryList({ works, onWorkClick }: HistoryListProps) {
  // Show completed, paid, and cobrado works
  const completedWorks = works.filter(w => 
    w.status === 'trabajo_terminado' || 
    w.status === 'cobrado' || 
    w.is_paid
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const totalCobrado = completedWorks
    .filter(w => w.is_paid)
    .reduce((sum, w) => sum + Number(w.amount), 0);

  if (completedWorks.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin trabajos completados</h3>
          <p className="text-muted-foreground">
            Los trabajos cobrados aparecerán aquí automáticamente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Euro className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-xl font-bold text-success">{formatCurrency(totalCobrado)}</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {completedWorks.length} trabajos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Works List */}
      <div className="space-y-3">
        {completedWorks.map(work => (
          <Card 
            key={work.id} 
            className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => onWorkClick(work)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{work.title}</h3>
                    {work.is_paid && (
                      <Badge className="bg-success/20 text-success text-xs">
                        Cobrado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {work.client?.name}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(work.updated_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                    {work.invoice_number && (
                      <span className="font-mono text-primary text-xs">
                        {work.invoice_number}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(Number(work.amount))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

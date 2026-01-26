import { useState, useMemo } from 'react';
import { WorkWithClient } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Archive, Euro, ChevronDown, ChevronUp, Building2, Calendar, Receipt, User, Phone, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HistorySectionProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
}

export function HistorySection({ works, onWorkClick }: HistorySectionProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Filter for completed/paid works only
  const historyWorks = works.filter(w => 
    w.status === 'cobrado' || 
    (w.status === 'trabajo_terminado' && w.is_paid)
  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Group works by year
  const worksByYear = useMemo(() => {
    const grouped: Record<number, WorkWithClient[]> = {};
    historyWorks.forEach(work => {
      const year = new Date(work.updated_at).getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(work);
    });
    return grouped;
  }, [historyWorks]);

  const years = Object.keys(worksByYear).map(Number).sort((a, b) => b - a);

  const totalCobrado = historyWorks.reduce((sum, w) => sum + Number(w.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleYear = (year: number) => {
    const newSet = new Set(expandedYears);
    if (newSet.has(year)) {
      newSet.delete(year);
    } else {
      newSet.add(year);
    }
    setExpandedYears(newSet);
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
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
                <p className="text-sm text-muted-foreground">Total Facturado y Cobrado</p>
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

      {/* History by Years */}
      {years.length > 0 ? (
        <div className="space-y-3">
          {years.map(year => {
            const yearWorks = worksByYear[year];
            const yearTotal = yearWorks.reduce((sum, w) => sum + Number(w.amount), 0);
            
            return (
              <div key={year} className="rounded-xl border border-border overflow-hidden bg-card">
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full p-4 flex items-center justify-between transition-colors bg-muted/50 hover:bg-muted/70"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">{year}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-background/50 text-sm font-medium">
                      {yearWorks.length} trabajos
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-success">
                      {formatCurrency(yearTotal)}
                    </span>
                    {expandedYears.has(year) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedYears.has(year) && (
                  <div className="bg-background/50 divide-y divide-border">
                    {yearWorks.map(work => (
                      <Collapsible
                        key={work.id}
                        open={expandedItems.has(work.id)}
                        onOpenChange={() => toggleItem(work.id)}
                      >
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {work.client?.company && (
                                  <Building2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                )}
                                <span className="font-medium text-foreground truncate">
                                  {work.client?.company || work.client?.name || 'Sin cliente'}
                                </span>
                                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                  ✅ Cobrado
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{work.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="font-semibold text-success">
                                {formatCurrency(Number(work.amount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(work.updated_at)}
                              </p>
                            </div>
                            {expandedItems.has(work.id) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-2">
                            <div className="p-3 rounded-lg bg-muted/30 space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Cliente:</span>
                                <span className="font-medium">{work.client?.name}</span>
                              </div>
                              {work.client?.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Teléfono:</span>
                                  <span className="font-medium">{work.client.phone}</span>
                                </div>
                              )}
                              {work.client?.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="font-medium">{work.client.email}</span>
                                </div>
                              )}
                              {work.invoice_number && (
                                <div className="flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Nº Factura:</span>
                                  <span className="font-medium">{work.invoice_number}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Fecha cobro:</span>
                                <span className="font-medium">{formatDate(work.updated_at)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Euro className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Total cobrado:</span>
                                <span className="font-medium text-success">{formatCurrency(Number(work.amount))}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => onWorkClick(work)}
                              className="text-sm text-primary hover:underline"
                            >
                              Ver detalle completo →
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border p-8 bg-card text-center">
          <Archive className="w-12 h-12 mx-auto mb-2 opacity-30 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sin trabajos completados</p>
          <p className="text-xs mt-1 text-muted-foreground">Los trabajos cobrados aparecerán aquí</p>
        </div>
      )}
    </div>
  );
}

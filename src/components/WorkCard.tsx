import { useState } from 'react';
import { WorkWithClient, WorkStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Phone, 
  Mail, 
  MessageSquare, 
  Trash2, 
  Check, 
  X, 
  Flag,
  Euro,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { usePresupuestos } from '@/hooks/usePresupuestos';

interface WorkCardProps {
  work: WorkWithClient;
  onClick: () => void;
  onDelete?: (workId: string) => void;
  onStatusChange?: (workId: string, newStatus: WorkStatus) => void;
  onMarkAsPaid?: (workId: string) => void;
}

export function WorkCard({ 
  work, 
  onClick, 
  onDelete,
  onStatusChange,
  onMarkAsPaid 
}: WorkCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { presupuestos } = usePresupuestos();
  const linkedPresupuesto = presupuestos.find(p => p.work_id === work.id);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!work.client?.phone) return;
    const phone = work.client.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const openEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!work.client?.email) return;
    window.open(`mailto:${work.client.email}`, '_blank');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(work.id);
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.(work.id, 'presupuesto_aceptado');
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(work.id);
  };

  const handleMarkFinished = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.(work.id, 'pendiente_facturar');
  };

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsPaid?.(work.id);
  };

  const pendingAmount = Number(work.amount) - Number(work.advance_payments || 0);
  const hasImages = work.images && work.images.length > 0;
  const partidas = linkedPresupuesto?.partidas as any[] || [];

  return (
    <div 
      className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Header - Company/Client First */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          {work.client?.company && (
            <div className="flex items-center gap-2 text-primary mb-1">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold truncate">{work.client.company}</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground truncate">
            {work.client?.name || 'Sin cliente'}
          </p>
          <h4 className="font-medium text-foreground mt-1">{work.title}</h4>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg text-primary">
            {formatCurrency(Number(work.amount))}
          </p>
          {Number(work.advance_payments || 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              Pendiente: {formatCurrency(pendingAmount)}
            </p>
          )}
        </div>
      </div>

      {/* Images indicator */}
      {hasImages && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
          <span>{work.images.length} imagen(es)</span>
        </div>
      )}

      {/* Budget Content - Visible */}
      {work.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {work.description}
        </p>
      )}

      {/* Budget items preview */}
      {partidas.length > 0 && (
        <div className="mb-3 p-2 rounded bg-muted/50 text-xs space-y-1">
          {partidas.slice(0, 3).map((partida: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span className="truncate flex-1">{partida.descripcion || 'Sin descripción'}</span>
              <span className="text-muted-foreground ml-2">
                {formatCurrency(Number(partida.cantidad || 0) * Number(partida.precio || 0))}
              </span>
            </div>
          ))}
          {partidas.length > 3 && (
            <p className="text-muted-foreground">+{partidas.length - 3} más...</p>
          )}
        </div>
      )}

      {/* Stage-specific Actions */}
      {work.status === 'presupuesto_enviado' && (
        <div className="flex gap-2 mb-3">
          <Button 
            size="sm" 
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleAccept}
          >
            <Check className="w-4 h-4 mr-1" />
            Aceptar
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            className="flex-1"
            onClick={handleReject}
          >
            <X className="w-4 h-4 mr-1" />
            Rechazar
          </Button>
        </div>
      )}

      {work.status === 'presupuesto_aceptado' && (
        <Button 
          size="sm" 
          className="w-full mb-3 bg-warning hover:bg-warning/90 text-warning-foreground"
          onClick={handleMarkFinished}
        >
          <Flag className="w-4 h-4 mr-1" />
          Trabajo Terminado
        </Button>
      )}

      {work.status === 'factura_enviada' && !work.is_paid && (
        <Button 
          size="sm" 
          className="w-full mb-3 bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={handleMarkPaid}
        >
          <Euro className="w-4 h-4 mr-1" />
          Marcar como Cobrada
        </Button>
      )}

      {/* Contact Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex gap-2">
          {work.client?.phone && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              onClick={openWhatsApp}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          {work.client?.email && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-primary hover:bg-primary/10"
              onClick={openEmail}
            >
              <Mail className="w-4 h-4" />
            </Button>
          )}
          {work.client?.phone && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-muted-foreground hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); window.open(`tel:${work.client?.phone}`); }}
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>

        {onDelete && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 px-2 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Expand/Collapse for more details */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
        className="w-full mt-2 pt-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
      >
        {showDetails ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Menos detalles
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Más detalles
          </>
        )}
      </button>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
          {linkedPresupuesto && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {work.status === 'factura_enviada' || work.status === 'cobrado' 
                  ? 'Estado de la Factura' 
                  : 'Estado del Presupuesto'}
              </span>
              <span className="font-medium capitalize">{linkedPresupuesto.estado_presupuesto}</span>
            </div>
          )}
          {Number(work.advance_payments || 0) > 0 && (
            <div className="flex justify-between text-emerald-500">
              <span>Anticipos recibidos</span>
              <span className="font-medium">{formatCurrency(Number(work.advance_payments))}</span>
            </div>
          )}
          {work.invoice_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nº Factura</span>
              <span className="font-medium">{work.invoice_number}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

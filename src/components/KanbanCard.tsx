import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkWithClient } from '@/types/database';
import { Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { isToday, isPast, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface KanbanCardProps {
  work: WorkWithClient;
  onClick: () => void;
  onDelete?: (workId: string) => void;
}

export function KanbanCard({ work, onClick, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: work.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isDueToday = work.due_date && isToday(parseISO(work.due_date));
  const isOverdue = work.due_date && isPast(parseISO(work.due_date)) && !isToday(parseISO(work.due_date));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onDelete) {
      onDelete(work.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`kanban-card animate-fade-in relative group ${
        isDueToday ? 'border-warning/50 bg-warning/5' : ''
      } ${
        isOverdue ? 'border-destructive/50 bg-destructive/5' : ''
      }`}
    >
      {/* Delete button - visible on hover */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive"
          title="Eliminar trabajo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-foreground text-sm leading-tight">
          {work.title}
        </p>
        {(isDueToday || isOverdue) && (
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
            isOverdue ? 'text-destructive' : 'text-warning'
          }`} />
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {work.client?.name || 'Sin cliente'}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {formatCurrency(Number(work.amount))}
        </span>
        
        {work.due_date && (
          <span className={`text-xs flex items-center gap-1 ${
            isOverdue ? 'text-destructive' :
            isDueToday ? 'text-warning' :
            'text-muted-foreground'
          }`}>
            <Clock className="w-3 h-3" />
            {format(parseISO(work.due_date), 'd MMM', { locale: es })}
          </span>
        )}
      </div>

      {work.invoice_number && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Factura: {work.invoice_number}
          </span>
        </div>
      )}

      {work.is_paid && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">
            Pagado
          </span>
        </div>
      )}
    </div>
  );
}

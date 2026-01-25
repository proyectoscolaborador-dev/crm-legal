import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  total: number;
  children: ReactNode;
}

export function KanbanColumn({ id, title, count, total, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column min-w-[280px] sm:min-w-[300px] flex-shrink-0 transition-colors ${
        isOver ? 'bg-primary/10 border-2 border-dashed border-primary/30' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {count}
          </span>
        </div>
        <span className="text-xs font-medium text-primary">
          {formatCurrency(total)}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {children}
      </div>
    </div>
  );
}

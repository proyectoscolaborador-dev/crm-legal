import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { WorkWithClient, WorkStatus, COLUMNS, STATUS_CONFIG } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { InvoiceConfirmDialog } from './InvoiceConfirmDialog';

interface KanbanBoardProps {
  works: WorkWithClient[];
  onStatusChange: (workId: string, status: WorkStatus, position: number) => void;
  onWorkClick: (work: WorkWithClient) => void;
  onGenerateInvoice?: (work: WorkWithClient) => void;
}

export function KanbanBoard({ works, onStatusChange, onWorkClick, onGenerateInvoice }: KanbanBoardProps) {
  const [activeWork, setActiveWork] = useState<WorkWithClient | null>(null);
  const [invoiceDialogWork, setInvoiceDialogWork] = useState<WorkWithClient | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    workId: string;
    status: WorkStatus;
    position: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter out completed/paid works - they go to History tab
  const activeWorks = works.filter(w => w.status !== 'trabajo_terminado' && !w.is_paid);

  const getWorksByStatus = (status: WorkStatus) => {
    return activeWorks
      .filter(w => w.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const work = activeWorks.find(w => w.id === event.active.id);
    if (work) setActiveWork(work);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWork(null);

    if (!over) return;

    const draggedWork = activeWorks.find(w => w.id === active.id);
    if (!draggedWork) return;

    // Determine the target column
    let targetStatus: WorkStatus;
    let targetPosition = 0;

    // Check if dropping on a column
    if (COLUMNS.includes(over.id as WorkStatus)) {
      targetStatus = over.id as WorkStatus;
      targetPosition = getWorksByStatus(targetStatus).length;
    } else {
      // Dropping on another card
      const overWork = activeWorks.find(w => w.id === over.id);
      if (!overWork) return;
      targetStatus = overWork.status;
      targetPosition = overWork.position;
    }

    // Check if moving to Facturación - show invoice confirmation dialog
    if (targetStatus === 'factura_enviada' && draggedWork.status !== 'factura_enviada') {
      setInvoiceDialogWork(draggedWork);
      setPendingStatusChange({ workId: draggedWork.id, status: targetStatus, position: targetPosition });
      return;
    }

    // Only update if something changed
    if (draggedWork.status !== targetStatus || draggedWork.position !== targetPosition) {
      onStatusChange(draggedWork.id, targetStatus, targetPosition);
    }
  };

  const handleInvoiceConfirm = (generateInvoice: boolean) => {
    if (pendingStatusChange) {
      onStatusChange(pendingStatusChange.workId, pendingStatusChange.status, pendingStatusChange.position);
      
      if (generateInvoice && invoiceDialogWork && onGenerateInvoice) {
        onGenerateInvoice(invoiceDialogWork);
      }
    }
    setInvoiceDialogWork(null);
    setPendingStatusChange(null);
  };

  const handleInvoiceCancel = () => {
    setInvoiceDialogWork(null);
    setPendingStatusChange(null);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {COLUMNS.map(status => {
            const columnWorks = getWorksByStatus(status);
            const columnTotal = columnWorks.reduce((sum, w) => sum + Number(w.amount), 0);

            return (
              <KanbanColumn
                key={status}
                id={status}
                title={STATUS_CONFIG[status].label}
                count={columnWorks.length}
                total={columnTotal}
              >
                <SortableContext
                  items={columnWorks.map(w => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnWorks.map(work => (
                    <KanbanCard
                      key={work.id}
                      work={work}
                      onClick={() => onWorkClick(work)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeWork && (
            <div className="kanban-card opacity-90 rotate-3 scale-105">
              <p className="font-medium text-foreground">{activeWork.title}</p>
              <p className="text-sm text-muted-foreground">{activeWork.client?.name}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <InvoiceConfirmDialog
        isOpen={!!invoiceDialogWork}
        onConfirm={handleInvoiceConfirm}
        onCancel={handleInvoiceCancel}
        workTitle={invoiceDialogWork?.title || ''}
        clientName={invoiceDialogWork?.client?.name || ''}
      />
    </>
  );
}

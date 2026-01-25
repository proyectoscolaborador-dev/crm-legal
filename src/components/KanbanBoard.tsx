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

interface KanbanBoardProps {
  works: WorkWithClient[];
  onStatusChange: (workId: string, status: WorkStatus, position: number) => void;
  onWorkClick: (work: WorkWithClient) => void;
}

export function KanbanBoard({ works, onStatusChange, onWorkClick }: KanbanBoardProps) {
  const [activeWork, setActiveWork] = useState<WorkWithClient | null>(null);

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

  const getWorksByStatus = (status: WorkStatus) => {
    return works
      .filter(w => w.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const work = works.find(w => w.id === event.active.id);
    if (work) setActiveWork(work);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWork(null);

    if (!over) return;

    const activeWork = works.find(w => w.id === active.id);
    if (!activeWork) return;

    // Determine the target column
    let targetStatus: WorkStatus;
    let targetPosition = 0;

    // Check if dropping on a column
    if (COLUMNS.includes(over.id as WorkStatus)) {
      targetStatus = over.id as WorkStatus;
      targetPosition = getWorksByStatus(targetStatus).length;
    } else {
      // Dropping on another card
      const overWork = works.find(w => w.id === over.id);
      if (!overWork) return;
      targetStatus = overWork.status;
      targetPosition = overWork.position;
    }

    // Only update if something changed
    if (activeWork.status !== targetStatus || activeWork.position !== targetPosition) {
      onStatusChange(activeWork.id, targetStatus, targetPosition);
    }
  };

  return (
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
  );
}

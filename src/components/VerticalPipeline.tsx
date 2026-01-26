import { WorkWithClient, WorkStatus, STAGE_CONFIG } from '@/types/database';
import { StageSection } from './StageSection';

interface VerticalPipelineProps {
  works: WorkWithClient[];
  onWorkClick: (work: WorkWithClient) => void;
  onDeleteClick?: (workId: string) => void;
}

export function VerticalPipeline({ works, onWorkClick, onDeleteClick }: VerticalPipelineProps) {
  // Filter out cobrado (paid) works - they go to history
  const activeWorks = works.filter(w => w.status !== 'cobrado' && w.status !== 'trabajo_terminado');

  const getWorksByStatus = (status: WorkStatus) => {
    return activeWorks
      .filter(w => w.status === status)
      .sort((a, b) => a.position - b.position);
  };

  // All stages - always show even if empty
  const stagesToShow: WorkStatus[] = [
    'presupuesto_solicitado',
    'presupuesto_enviado',
    'presupuesto_aceptado',
    'pendiente_facturar',
    'factura_enviada',
  ];

  return (
    <div className="space-y-4">
      {stagesToShow.map(status => {
        const stageWorks = getWorksByStatus(status);
        return (
          <StageSection
            key={status}
            status={status}
            works={stageWorks}
            onWorkClick={onWorkClick}
            onDeleteClick={onDeleteClick}
          />
        );
      })}

      {/* Empty state when no works at all */}
      {works.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No hay trabajos activos</p>
          <p className="text-sm mt-1">Pulsa el botón + para crear un nuevo trabajo</p>
        </div>
      )}
    </div>
  );
}

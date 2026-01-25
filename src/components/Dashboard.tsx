import { useMemo } from 'react';
import { WorkWithClient } from '@/types/database';
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  works: WorkWithClient[];
}

export function Dashboard({ works }: DashboardProps) {
  const stats = useMemo(() => {
    const presupuestosEnviados = works
      .filter(w => w.status === 'presupuesto_enviado')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendientesCobro = works
      .filter(w => w.status === 'factura_enviada' && !w.is_paid)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const cobrado = works
      .filter(w => w.is_paid)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const trabajosActivos = works.filter(
      w => w.status !== 'trabajo_terminado'
    ).length;

    return { presupuestosEnviados, pendientesCobro, cobrado, trabajosActivos };
  }, [works]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 rounded-lg bg-primary/20">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Presupuestos Enviados</p>
            <p className="text-base sm:text-xl font-bold text-foreground truncate">
              {formatCurrency(stats.presupuestosEnviados)}
            </p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 rounded-lg bg-warning/20">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Pendientes Cobro</p>
            <p className="text-base sm:text-xl font-bold text-foreground truncate">
              {formatCurrency(stats.pendientesCobro)}
            </p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 rounded-lg bg-secondary/20">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Cobrado</p>
            <p className="text-base sm:text-xl font-bold text-foreground truncate">
              {formatCurrency(stats.cobrado)}
            </p>
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-3 rounded-lg bg-muted">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Trabajos Activos</p>
            <p className="text-base sm:text-xl font-bold text-foreground">
              {stats.trabajosActivos}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

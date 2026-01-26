import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorks } from '@/hooks/useWorks';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Clock, CheckCircle, AlertTriangle, BarChart3, PieChart, Wallet, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { STAGE_CONFIG, WorkStatus } from '@/types/database';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

export default function Analytics() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { works, isLoading: worksLoading } = useWorks();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const stats = useMemo(() => {
    const presupuestosEnviados = works
      .filter(w => w.status === 'presupuesto_enviado')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendientesCobro = works
      .filter(w => w.status === 'factura_enviada' && !w.is_paid)
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const cobrado = works
      .filter(w => w.is_paid || w.status === 'cobrado')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const trabajosActivos = works.filter(
      w => w.status !== 'trabajo_terminado' && w.status !== 'cobrado'
    ).length;

    const enObra = works
      .filter(w => w.status === 'presupuesto_aceptado')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const pendienteFacturar = works
      .filter(w => w.status === 'pendiente_facturar')
      .reduce((sum, w) => sum + Number(w.amount), 0);

    const totalAdvances = works.reduce((sum, w) => sum + Number(w.advance_payments || 0), 0);

    return { 
      presupuestosEnviados, 
      pendientesCobro, 
      cobrado, 
      trabajosActivos, 
      enObra, 
      pendienteFacturar,
      totalAdvances 
    };
  }, [works]);

  const stageBreakdown = useMemo(() => {
    const breakdown: Record<WorkStatus, { count: number; amount: number }> = {} as any;
    
    Object.keys(STAGE_CONFIG).forEach(status => {
      const stageWorks = works.filter(w => w.status === status);
      breakdown[status as WorkStatus] = {
        count: stageWorks.length,
        amount: stageWorks.reduce((sum, w) => sum + Number(w.amount), 0),
      };
    });

    return breakdown;
  }, [works]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      // Delete all presupuestos first (due to foreign key)
      await supabase.from('presupuestos').delete().eq('user_id', user.id);
      // Delete all works
      await supabase.from('works').delete().eq('user_id', user.id);
      // Delete all clients
      await supabase.from('clients').delete().eq('user_id', user.id);
      // Delete all reminders
      await supabase.from('reminders').delete().eq('user_id', user.id);
      
      toast.success('Todos los datos han sido eliminados');
      setResetDialogOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Error al resetear los datos');
    } finally {
      setIsResetting(false);
    }
  };

  if (authLoading || worksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="transition-transform active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Analíticas</h1>
            </div>
          </div>
          
          {/* Reset Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 transition-transform active:scale-95"
            onClick={() => setResetDialogOpen(true)}
          >
            <RotateCcw className="w-4 h-4" />
            Reset datos
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Presupuestos Enviados</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.presupuestosEnviados)}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">Pendientes Cobro</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.pendientesCobro)}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm text-muted-foreground">Total Cobrado</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.cobrado)}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Trabajos Activos</span>
            </div>
            <p className="text-2xl font-bold">{stats.trabajosActivos}</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <PieChart className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">En Obra</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.enObra)}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-sm text-muted-foreground">Pendiente Facturar</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.pendienteFacturar)}</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Wallet className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm text-muted-foreground">Anticipos Recibidos</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAdvances)}</p>
          </div>
        </div>

        {/* Stage Breakdown */}
        <div className="p-6 rounded-xl bg-card border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Desglose por Etapa
          </h2>
          <div className="space-y-3">
            {Object.entries(STAGE_CONFIG).map(([status, config]) => {
              const data = stageBreakdown[status as WorkStatus];
              if (!data) return null;
              
              return (
                <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${config.bgColor.replace('hover:', '')}`} />
                    <span className="font-medium">{config.label}</span>
                    <span className="text-sm text-muted-foreground">({data.count} trabajos)</span>
                  </div>
                  <span className={`font-semibold ${config.color}`}>
                    {formatCurrency(data.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              ¿Eliminar todos los datos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos tus clientes, trabajos, presupuestos y recordatorios. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar todo'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

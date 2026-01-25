import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { Presupuesto } from '@/types/empresa';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Loader2, 
  Download,
  Eye,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviado: 'bg-primary/20 text-primary',
  aceptado: 'bg-success/20 text-success',
  rechazado: 'bg-destructive/20 text-destructive',
};

const STATUS_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
};

export default function Presupuestos() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, isLoading: presupuestosLoading, deletePresupuesto } = usePresupuestos();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Redirect to empresa form if not complete
  useEffect(() => {
    if (!empresaLoading && !isEmpresaComplete && user) {
      navigate('/mis-datos-empresa', { 
        state: { returnTo: '/presupuestos' },
        replace: true 
      });
    }
  }, [empresaLoading, isEmpresaComplete, user, navigate]);

  if (authLoading || empresaLoading || presupuestosLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deletePresupuesto.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Presupuestos</h1>
            </div>
          </div>
          <Button onClick={() => navigate('/presupuestos/nuevo')} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Presupuesto</span>
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6">
        {presupuestos.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay presupuestos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer presupuesto profesional
              </p>
              <Button onClick={() => navigate('/presupuestos/nuevo')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear presupuesto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {presupuestos.map((p: Presupuesto) => (
              <Card key={p.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-primary">
                          {p.numero_presupuesto}
                        </span>
                        <Badge className={STATUS_COLORS[p.estado_presupuesto]}>
                          {STATUS_LABELS[p.estado_presupuesto]}
                        </Badge>
                      </div>
                      <h3 className="font-medium truncate">{p.obra_titulo}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.cliente_nombre}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(p.fecha_presupuesto), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(p.total_presupuesto)}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem onClick={() => navigate(`/presupuestos/${p.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver / Editar
                        </DropdownMenuItem>
                        {p.pdf_url && (
                          <DropdownMenuItem onClick={() => window.open(p.pdf_url!, '_blank')}>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setDeleteId(p.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

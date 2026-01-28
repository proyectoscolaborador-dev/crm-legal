import { useState } from 'react';
import { Home, HardHat, UserPlus, Briefcase, CalendarDays, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Index from './Index';
import { NewClientModal } from '@/components/NewClientModal';
import { CreateWorkModal } from '@/components/CreateWorkModal';
import { useClients } from '@/hooks/useClients';
import { useNavigate } from 'react-router-dom';
import { Client } from '@/types/database';
import { WorkWithClientData } from '@/components/CreateWorkModal';
import { useWorks } from '@/hooks/useWorks';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { toast } from 'sonner';
import { ObraAssistant } from '@/components/ObraAssistant';

type ViewMode = 'selection' | 'casa' | 'obra';

export default function Landing() {
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false);
  const navigate = useNavigate();
  
  const { clients, createClient } = useClients();
  const { createWork } = useWorks();
  const { createPresupuesto, getNextNumero } = usePresupuestos();

  const handleCreateClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Client> => {
    const result = await createClient.mutateAsync(clientData);
    return result as Client;
  };

  const handleCreateWorkWithPresupuesto = async (workData: WorkWithClientData) => {
    try {
      const newWork = await createWork.mutateAsync({
        client_id: workData.client_id,
        title: workData.title,
        description: workData.description,
        amount: workData.amount,
        status: workData.status,
        position: workData.position,
        images: workData.images || [],
      });
      
      const initialAmount = workData.amount || 0;
      const initialPartidas = initialAmount > 0 
        ? [{
            id: crypto.randomUUID(),
            concepto: workData.title || 'Trabajo inicial',
            cantidad: 1,
            precio_unidad: initialAmount / 1.21,
            importe_linea: initialAmount / 1.21,
          }]
        : [];
      
      await createPresupuesto.mutateAsync({
        numero_presupuesto: getNextNumero(),
        cliente_nombre: workData.clientData.name || 'Sin nombre',
        cliente_nif: workData.clientData.nif,
        cliente_email: workData.clientData.email,
        cliente_telefono: workData.clientData.phone,
        cliente_direccion: workData.clientData.address,
        cliente_cp: workData.clientData.postal_code,
        cliente_ciudad: workData.clientData.city,
        cliente_provincia: workData.clientData.province,
        descripcion_trabajo_larga: workData.description,
        obra_titulo: workData.title,
        partidas: initialPartidas,
        iva_porcentaje: 21,
        estado_presupuesto: 'borrador',
        fecha_presupuesto: new Date().toISOString().split('T')[0],
        validez_dias: 30,
        comercial_nombre: null,
        work_id: newWork.id,
        pdf_url: null,
      });

      toast.success('Trabajo y presupuesto creados');
      setIsNewWorkOpen(false);
    } catch (error) {
      console.error('Error creating work:', error);
      toast.error('Error al crear el trabajo');
    }
  };

  if (viewMode === 'casa') {
    return <Index onBack={() => setViewMode('selection')} />;
  }

  if (viewMode === 'obra') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="container px-4 py-4 flex items-center justify-between">
            <button 
              onClick={() => setViewMode('selection')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              <span className="font-medium">Volver</span>
            </button>
            <div className="flex items-center gap-2">
              <HardHat className="w-6 h-6 text-warning" />
              <span className="font-bold text-lg">Modo Obra</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-4">
              <Card 
                className="p-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 cursor-pointer hover:border-primary/40 transition-all group"
                onClick={() => setIsNewClientOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">Nuevo Cliente</h3>
                    <p className="text-muted-foreground">Añade un cliente rápidamente</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>

              <Card 
                className="p-6 bg-gradient-to-br from-secondary/10 via-card to-card border-secondary/20 cursor-pointer hover:border-secondary/40 transition-all group"
                onClick={() => setIsNewWorkOpen(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase className="w-8 h-8 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">Nuevo Trabajo</h3>
                    <p className="text-muted-foreground">Crea un trabajo con presupuesto</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>

              <Card 
                className="p-6 bg-gradient-to-br from-warning/10 via-card to-card border-warning/20 cursor-pointer hover:border-warning/40 transition-all group"
                onClick={() => navigate('/alertas')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-8 h-8 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">Agenda</h3>
                    <p className="text-muted-foreground">Ver citas y recordatorios</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-warning group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </div>

            {/* Mistral Assistant - Prominent */}
            <div className="mt-8">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full mb-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <span className="font-semibold text-foreground">Asistente IA</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dime qué necesitas y lo haré por ti
                </p>
              </div>
              <ObraAssistant />
            </div>
          </div>
        </div>

        {/* Modals */}
        <NewClientModal
          isOpen={isNewClientOpen}
          onClose={() => setIsNewClientOpen(false)}
          onCreateClient={(client) => createClient.mutate({
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            notes: client.notes,
            nif: client.nif || null,
            address: client.address || null,
            postal_code: client.postal_code || null,
            city: client.city || null,
            province: client.province || null,
            country: client.country || null,
          })}
        />

        <CreateWorkModal
          isOpen={isNewWorkOpen}
          onClose={() => setIsNewWorkOpen(false)}
          clients={clients}
          onCreateWork={handleCreateWorkWithPresupuesto}
          onCreateClient={handleCreateClient}
          isLoading={createWork.isPending}
        />
      </div>
    );
  }

  // Selection View
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo/Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold gradient-text">Copiloto CRM</h1>
          <p className="text-muted-foreground">¿Dónde estás trabajando hoy?</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          <Card 
            className="p-8 bg-gradient-to-br from-primary/5 via-card to-card border-2 border-primary/20 cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all group"
            onClick={() => setViewMode('casa')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Home className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">En Casa</h2>
                <p className="text-muted-foreground">Gestión completa del CRM</p>
              </div>
              <Button className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90">
                Acceder
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </Card>

          <Card 
            className="p-8 bg-gradient-to-br from-warning/5 via-card to-card border-2 border-warning/20 cursor-pointer hover:border-warning hover:shadow-lg hover:shadow-warning/10 transition-all group"
            onClick={() => setViewMode('obra')}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HardHat className="w-12 h-12 text-warning" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">En Obra</h2>
                <p className="text-muted-foreground">Acceso rápido + Asistente IA</p>
              </div>
              <Button className="w-full h-12 text-lg font-semibold bg-warning text-warning-foreground hover:bg-warning/90">
                Acceder
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

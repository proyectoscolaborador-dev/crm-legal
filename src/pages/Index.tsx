import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { useReminders } from '@/hooks/useReminders';
import { WorkWithClient, WorkStatus, Client } from '@/types/database';
import { WorkWithClientData } from '@/components/CreateWorkModal';
import { Header } from '@/components/Header';
import { AlertsSection } from '@/components/AlertsSection';
import { VerticalPipeline } from '@/components/VerticalPipeline';
import { WorkDetailView } from '@/components/WorkDetailView';
import { CreateWorkModal } from '@/components/CreateWorkModal';
import { ImportCSV } from '@/components/ImportCSV';
import { CalendarView } from '@/components/CalendarView';
import { ClientsList } from '@/components/ClientsList';
import { MobileNav } from '@/components/MobileNav';
import { NewClientModal } from '@/components/NewClientModal';
import { DeleteWorkDialog } from '@/components/DeleteWorkDialog';
import { HistorySection } from '@/components/HistorySection';
import { ReminderNotification } from '@/components/ReminderNotification';
import { ChatBar } from '@/components/ChatBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Loader2, Home, Calendar, Users, BarChart3, Archive } from 'lucide-react';
import { toast } from 'sonner';

interface IndexProps {
  onBack?: () => void;
}

export default function Index({ onBack }: IndexProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { clients, createClient, updateClient, deleteClient } = useClients();
  const { works, createWork, updateWork, updateWorkStatus, deleteWork, markAsPaid, isLoading: worksLoading } = useWorks();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, createPresupuesto, deletePresupuesto, getNextNumero } = usePresupuestos();
  const { reminders } = useReminders();

  const [selectedWork, setSelectedWork] = useState<WorkWithClient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
  const [isCreatingWork, setIsCreatingWork] = useState(false);
  
  // Delete work dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle navigation state to open a specific work
  useEffect(() => {
    const state = location.state as { openWorkId?: string } | null;
    if (state?.openWorkId && works.length > 0) {
      const workToOpen = works.find(w => w.id === state.openWorkId);
      if (workToOpen) {
        setSelectedWork(workToOpen);
        setIsDetailOpen(true);
        // Clear the state to prevent reopening on subsequent renders
        navigate('/', { replace: true, state: {} });
      }
    }
  }, [location.state, works, navigate]);

  // Listen for navigate-to-tab events from Landing
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent<string>) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    return () => {
      window.removeEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    };
  }, []);

  if (authLoading || empresaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No auth required - app works without login
  // if (!user) {
  //   return <Navigate to="/auth" replace />;
  // }

  const handleNewWorkClick = () => {
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa antes de crear trabajos');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleWorkClick = (work: WorkWithClient) => {
    setSelectedWork(work);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedWork(null);
  };

  const handleStatusChange = (workId: string, status: WorkStatus) => {
    const work = works.find(w => w.id === workId);
    updateWorkStatus.mutate({ id: workId, status, position: work?.position || 0 });
  };

  const handleMarkAsPaid = (workId: string) => {
    markAsPaid.mutate(workId);
    const work = works.find(w => w.id === workId);
    if (work) {
      updateWorkStatus.mutate({ id: workId, status: 'cobrado', position: work.position });
    }
  };

  const handleImportClients = async (importedClients: Array<{ 
    name: string; 
    email: string | null; 
    phone: string | null; 
    company: string | null; 
    notes: string | null;
    nif?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
  }>) => {
    for (const client of importedClients) {
      await createClient.mutateAsync({
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
      });
    }
  };

  const handleCreateClient = async (clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Client> => {
    const result = await createClient.mutateAsync(clientData);
    return result as Client;
  };

  const handleCreateWorkWithPresupuesto = async (workData: WorkWithClientData) => {
    setIsCreatingWork(true);

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
      
      // Calculate initial partida from work amount if provided
      const initialAmount = workData.amount || 0;
      const initialPartidas = initialAmount > 0 
        ? [{
            id: crypto.randomUUID(),
            concepto: workData.title || 'Trabajo inicial',
            cantidad: 1,
            precio_unidad: initialAmount / 1.21, // Remove IVA for base price
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

      toast.success('Trabajo y presupuesto borrador creados');
    } catch (error) {
      console.error('Error creating work with presupuesto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al crear el trabajo: ${errorMessage}`);
    } finally {
      setIsCreatingWork(false);
    }
  };

  const handleDeleteWorkClick = (workId: string) => {
    setWorkToDelete(workId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteWork = async () => {
    if (!workToDelete) return;
    
    setIsDeleting(true);
    try {
      const linkedPresupuesto = presupuestos.find(p => p.work_id === workToDelete);
      if (linkedPresupuesto) {
        await deletePresupuesto.mutateAsync(linkedPresupuesto.id);
      }
      await deleteWork.mutateAsync(workToDelete);
    } catch (error) {
      console.error('Error deleting work:', error);
      toast.error('Error al eliminar el trabajo');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setWorkToDelete(null);
    }
  };

  const workToDeleteData = works.find(w => w.id === workToDelete);

  const handleTabChange = (tab: string) => {
    if (tab === 'analytics') {
      navigate('/analiticas');
    } else {
      setActiveTab(tab);
    }
  };

  // Show full-screen detail view when work is selected
  if (isDetailOpen && selectedWork) {
    return (
      <WorkDetailView
        work={selectedWork}
        onClose={handleCloseDetail}
        onStatusChange={handleStatusChange}
        onMarkAsPaid={handleMarkAsPaid}
        onDeleteWork={handleDeleteWorkClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-44 md:pb-28">
      <Header
        onNewWork={handleNewWorkClick}
        onImportCSV={() => setIsImportOpen(true)}
        onNewClient={() => setIsNewClientOpen(true)}
        onBack={onBack}
      />

      <main className="container px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <AlertsSection 
          works={works} 
          presupuestos={presupuestos}
          reminders={reminders}
          onWorkClick={handleWorkClick} 
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="hidden md:block">
          <TabsList className="bg-muted">
            <TabsTrigger value="inicio" className="gap-2">
              <Home className="w-4 h-4" />
              Inicio
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Archive className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analíticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inicio" className="mt-4">
            <VerticalPipeline 
              works={works} 
              onWorkClick={handleWorkClick}
              onDeleteClick={handleDeleteWorkClick}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView works={works} onWorkClick={handleWorkClick} />
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientsList 
              clients={clients} 
              works={works} 
              onDeleteClient={(id) => deleteClient.mutate(id)}
              onUpdateClient={(updates) => updateClient.mutate(updates)}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <HistorySection works={works} onWorkClick={handleWorkClick} />
          </TabsContent>
        </Tabs>

        {/* Mobile Content */}
        <div className="md:hidden">
          {activeTab === 'inicio' && (
            <VerticalPipeline 
              works={works} 
              onWorkClick={handleWorkClick}
              onDeleteClick={handleDeleteWorkClick}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarView works={works} onWorkClick={handleWorkClick} />
          )}
          {activeTab === 'clients' && (
            <ClientsList 
              clients={clients} 
              works={works} 
              onDeleteClient={(id) => deleteClient.mutate(id)}
              onUpdateClient={(updates) => updateClient.mutate(updates)}
            />
          )}
          {activeTab === 'history' && (
            <HistorySection works={works} onWorkClick={handleWorkClick} />
          )}
        </div>
      </main>

      <MobileNav activeTab={activeTab} onTabChange={handleTabChange} onImportCSV={() => setIsImportOpen(true)} />

      <CreateWorkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        clients={clients}
        onCreateWork={handleCreateWorkWithPresupuesto}
        onCreateClient={handleCreateClient}
        isLoading={isCreatingWork}
      />

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

      <ImportCSV isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleImportClients} />

      <DeleteWorkDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setWorkToDelete(null);
        }}
        onConfirm={handleConfirmDeleteWork}
        workTitle={workToDeleteData?.title}
        isDeleting={isDeleting}
      />

      {/* Reminder Notifications */}
      <ReminderNotification />

      {/* ChatBar - Mistral AI - Barra fija inferior */}
      <ChatBar />
    </div>
  );
}

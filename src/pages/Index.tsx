import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { useEmpresa } from '@/hooks/useEmpresa';
import { usePresupuestos } from '@/hooks/usePresupuestos';
import { WorkWithClient, WorkStatus, Client } from '@/types/database';
import { WorkWithClientData } from '@/components/CreateWorkModal';
import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { AlertsSection } from '@/components/AlertsSection';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ClientPanel } from '@/components/ClientPanel';
import { CreateWorkModal } from '@/components/CreateWorkModal';
import { ImportCSV } from '@/components/ImportCSV';
import { CalendarView } from '@/components/CalendarView';
import { ClientsList } from '@/components/ClientsList';
import { MobileNav } from '@/components/MobileNav';
import { NewClientModal } from '@/components/NewClientModal';
import { DeleteWorkDialog } from '@/components/DeleteWorkDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { HistoryList } from '@/components/HistoryList';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { clients, createClient, updateClient, deleteClient } = useClients();
  const { works, createWork, updateWork, updateWorkStatus, deleteWork, isLoading: worksLoading } = useWorks();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, createPresupuesto, deletePresupuesto, getNextNumero } = usePresupuestos();

  const [selectedWork, setSelectedWork] = useState<WorkWithClient | null>(null);
  const [isClientPanelOpen, setIsClientPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isCreatingWork, setIsCreatingWork] = useState(false);
  
  // Delete work dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (authLoading || empresaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleNewWorkClick = () => {
    // Check if empresa data is complete before allowing work creation
    if (!isEmpresaComplete) {
      toast.error('Debes completar los datos de tu empresa antes de crear trabajos');
      navigate('/mis-datos-empresa', { state: { returnTo: '/' } });
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleWorkClick = (work: WorkWithClient) => {
    setSelectedWork(work);
    setIsClientPanelOpen(true);
  };

  const handleStatusChange = (workId: string, status: WorkStatus, position: number) => {
    updateWorkStatus.mutate({ id: workId, status, position });
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

  // Uses data directly from the form, not from database lookup
  const handleCreateWorkWithPresupuesto = async (workData: WorkWithClientData) => {
    setIsCreatingWork(true);

    try {
      // Create work first
      const newWork = await createWork.mutateAsync({
        client_id: workData.client_id,
        title: workData.title,
        description: workData.description,
        amount: workData.amount,
        status: workData.status,
        position: workData.position,
      });
      
      // Auto-create presupuesto using CLIENT DATA FROM FORM (not from DB lookup)
      // This avoids timing issues where the client isn't in the cache yet
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
        partidas: [],
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

  // Handle delete work from Kanban card
  const handleDeleteWorkClick = (workId: string) => {
    setWorkToDelete(workId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteWork = async () => {
    if (!workToDelete) return;
    
    setIsDeleting(true);
    try {
      // Find and delete linked presupuesto first
      const linkedPresupuesto = presupuestos.find(p => p.work_id === workToDelete);
      if (linkedPresupuesto) {
        await deletePresupuesto.mutateAsync(linkedPresupuesto.id);
      }
      // Then delete the work
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onNewWork={handleNewWorkClick}
        onImportCSV={() => setIsImportOpen(true)}
        onNewClient={() => setIsNewClientOpen(true)}
      />

      <main className="container px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Dashboard works={works} />
        <AlertsSection works={works} onWorkClick={handleWorkClick} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
          <TabsList className="bg-muted">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="calendar">Agenda</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <KanbanBoard 
              works={works} 
              onStatusChange={handleStatusChange} 
              onWorkClick={handleWorkClick}
              onDeleteWork={handleDeleteWorkClick}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <HistoryList works={works} onWorkClick={handleWorkClick} />
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
        </Tabs>

        {/* Mobile Content */}
        <div className="md:hidden">
          {activeTab === 'pipeline' && (
            <KanbanBoard 
              works={works} 
              onStatusChange={handleStatusChange} 
              onWorkClick={handleWorkClick}
              onDeleteWork={handleDeleteWorkClick}
            />
          )}
          {activeTab === 'history' && (
            <HistoryList works={works} onWorkClick={handleWorkClick} />
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
        </div>
      </main>

      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} onImportCSV={() => setIsImportOpen(true)} />

      <ClientPanel
        work={selectedWork}
        allWorks={works}
        isOpen={isClientPanelOpen}
        onClose={() => setIsClientPanelOpen(false)}
        onUpdateWork={(updates) => updateWork.mutate(updates)}
      />

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

      {/* Delete Work Confirmation Dialog */}
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
    </div>
  );
}

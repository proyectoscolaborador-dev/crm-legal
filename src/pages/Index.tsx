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
import { AlertsSection } from '@/components/AlertsSection';
import { VerticalPipeline } from '@/components/VerticalPipeline';
import { ClientPanel } from '@/components/ClientPanel';
import { CreateWorkModal } from '@/components/CreateWorkModal';
import { ImportCSV } from '@/components/ImportCSV';
import { CalendarView } from '@/components/CalendarView';
import { ClientsList } from '@/components/ClientsList';
import { MobileNav } from '@/components/MobileNav';
import { NewClientModal } from '@/components/NewClientModal';
import { DeleteWorkDialog } from '@/components/DeleteWorkDialog';
import { GeminiAssistant } from '@/components/GeminiAssistant';
import { HistoryList } from '@/components/HistoryList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Loader2, Home, Calendar, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { clients, createClient, updateClient, deleteClient } = useClients();
  const { works, createWork, updateWork, updateWorkStatus, deleteWork, markAsPaid, isLoading: worksLoading } = useWorks();
  const { empresa, isLoading: empresaLoading, isEmpresaComplete } = useEmpresa();
  const { presupuestos, createPresupuesto, deletePresupuesto, getNextNumero } = usePresupuestos();

  const [selectedWork, setSelectedWork] = useState<WorkWithClient | null>(null);
  const [isClientPanelOpen, setIsClientPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
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

  const handleStatusChange = (workId: string, status: WorkStatus) => {
    const work = works.find(w => w.id === workId);
    updateWorkStatus.mutate({ id: workId, status, position: work?.position || 0 });
  };

  const handleMarkAsPaid = (workId: string) => {
    markAsPaid.mutate(workId);
    // Also update status to cobrado
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

  // Uses data directly from the form, not from database lookup
  const handleCreateWorkWithPresupuesto = async (workData: WorkWithClientData) => {
    setIsCreatingWork(true);

    try {
      // Create work first with images
      const newWork = await createWork.mutateAsync({
        client_id: workData.client_id,
        title: workData.title,
        description: workData.description,
        amount: workData.amount,
        status: workData.status,
        position: workData.position,
        images: workData.images || [],
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

  // Handle delete work from card
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

  // Handle analytics tab - navigate to analytics page
  const handleTabChange = (tab: string) => {
    if (tab === 'analytics') {
      navigate('/analiticas');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onNewWork={handleNewWorkClick}
        onImportCSV={() => setIsImportOpen(true)}
        onNewClient={() => setIsNewClientOpen(true)}
      />

      <main className="container px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* No Dashboard stats here - moved to Analytics */}
        <AlertsSection works={works} onWorkClick={handleWorkClick} />

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
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analíticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inicio" className="mt-4">
            <VerticalPipeline 
              works={works} 
              onWorkClick={handleWorkClick}
              onDeleteWork={handleDeleteWorkClick}
              onStatusChange={handleStatusChange}
              onMarkAsPaid={handleMarkAsPaid}
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
        </Tabs>

        {/* Mobile Content */}
        <div className="md:hidden">
          {activeTab === 'inicio' && (
            <VerticalPipeline 
              works={works} 
              onWorkClick={handleWorkClick}
              onDeleteWork={handleDeleteWorkClick}
              onStatusChange={handleStatusChange}
              onMarkAsPaid={handleMarkAsPaid}
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
        </div>
      </main>

      <MobileNav activeTab={activeTab} onTabChange={handleTabChange} onImportCSV={() => setIsImportOpen(true)} />

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

      {/* Gemini Assistant - Floating Widget */}
      <GeminiAssistant />
    </div>
  );
}

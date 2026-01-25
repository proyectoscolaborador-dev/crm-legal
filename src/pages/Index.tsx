import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { useWorks } from '@/hooks/useWorks';
import { WorkWithClient, WorkStatus } from '@/types/database';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { clients, createClient, deleteClient } = useClients();
  const { works, createWork, updateWork, updateWorkStatus } = useWorks();

  const [selectedWork, setSelectedWork] = useState<WorkWithClient | null>(null);
  const [isClientPanelOpen, setIsClientPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleWorkClick = (work: WorkWithClient) => {
    setSelectedWork(work);
    setIsClientPanelOpen(true);
  };

  const handleStatusChange = (workId: string, status: WorkStatus, position: number) => {
    updateWorkStatus.mutate({ id: workId, status, position });
  };

  const handleImportClients = async (importedClients: Array<{ name: string; email: string | null; phone: string | null; company: string | null; notes: string | null }>) => {
    for (const client of importedClients) {
      await createClient.mutateAsync(client);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header
        onNewWork={() => setIsCreateModalOpen(true)}
        onImportCSV={() => setIsImportOpen(true)}
      />

      <main className="container px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Dashboard works={works} />
        <AlertsSection works={works} onWorkClick={handleWorkClick} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
          <TabsList className="bg-muted">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="calendar">Agenda</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <KanbanBoard works={works} onStatusChange={handleStatusChange} onWorkClick={handleWorkClick} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <CalendarView works={works} onWorkClick={handleWorkClick} />
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientsList clients={clients} works={works} onDeleteClient={(id) => deleteClient.mutate(id)} />
          </TabsContent>
        </Tabs>

        {/* Mobile Content */}
        <div className="md:hidden">
          {activeTab === 'pipeline' && (
            <KanbanBoard works={works} onStatusChange={handleStatusChange} onWorkClick={handleWorkClick} />
          )}
          {activeTab === 'calendar' && (
            <CalendarView works={works} onWorkClick={handleWorkClick} />
          )}
          {activeTab === 'clients' && (
            <ClientsList clients={clients} works={works} onDeleteClient={(id) => deleteClient.mutate(id)} />
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
        onCreateWork={(work) => createWork.mutate(work)}
        onCreateClient={(client) => createClient.mutate(client)}
      />

      <ImportCSV isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={handleImportClients} />
    </div>
  );
}

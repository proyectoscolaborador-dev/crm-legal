import { useState } from 'react';
import { Client, WorkWithClient } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Building2, Search, Trash2, Edit, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ClientsListProps {
  clients: Client[];
  works: WorkWithClient[];
  onDeleteClient: (id: string) => void;
  onUpdateClient?: (updates: Partial<Client> & { id: string }) => void;
}

export function ClientsList({ clients, works, onDeleteClient, onUpdateClient }: ClientsListProps) {
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.company?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search)
  );

  const getClientLTV = (clientId: string) => {
    return works
      .filter(w => w.client_id === clientId && w.is_paid)
      .reduce((sum, w) => sum + Number(w.amount), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      notes: client.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingClient || !onUpdateClient) return;
    onUpdateClient({
      id: editingClient.id,
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      company: editForm.company || null,
      notes: editForm.notes || null,
    });
    setEditingClient(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o empresa..."
          className="pl-10 bg-muted border-border h-12"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => {
          const ltv = getClientLTV(client.id);
          const workCount = works.filter(w => w.client_id === client.id).length;

          return (
            <div
              key={client.id}
              className="glass-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                  {client.company && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {client.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {onUpdateClient && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary h-8 w-8"
                      onClick={() => handleEditClick(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => onDeleteClient(client.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                {client.email && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {workCount} trabajo(s)
                </span>
                <span className="text-sm font-medium text-primary">
                  LTV: {formatCurrency(ltv)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search ? 'No se encontraron clientes' : 'No hay clientes en la agenda'}
          </p>
        </div>
      )}

      {/* Edit Client Modal */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-muted border-border h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-muted border-border h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="bg-muted border-border h-12"
                inputMode="tel"
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                className="bg-muted border-border h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="bg-muted border-border resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingClient(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editForm.name}
              className="bg-primary text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

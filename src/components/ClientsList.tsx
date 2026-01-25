import { useState } from 'react';
import { Client, WorkWithClient } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Building2, Search, Trash2, Edit, Save, X, MapPin, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    nif: '',
    address: '',
    postal_code: '',
    city: '',
    province: '',
    country: '',
    notes: '',
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.company?.toLowerCase().includes(search.toLowerCase()) ||
    client.phone?.includes(search) ||
    client.nif?.toLowerCase().includes(search.toLowerCase()) ||
    client.city?.toLowerCase().includes(search.toLowerCase())
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
      nif: client.nif || '',
      address: client.address || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      province: client.province || '',
      country: client.country || 'España',
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
      nif: editForm.nif || null,
      address: editForm.address || null,
      postal_code: editForm.postal_code || null,
      city: editForm.city || null,
      province: editForm.province || null,
      country: editForm.country || null,
      notes: editForm.notes || null,
    });
    setEditingClient(null);
  };

  const formatAddress = (client: Client) => {
    const parts = [client.city, client.province].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, NIF, email, teléfono, ciudad..."
          className="pl-10 bg-muted border-border h-12"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => {
          const ltv = getClientLTV(client.id);
          const workCount = works.filter(w => w.client_id === client.id).length;
          const addressDisplay = formatAddress(client);

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
                  {client.nif && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3" />
                      {client.nif}
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
                {addressDisplay && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {addressDisplay}
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
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] px-6">
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
                <Label>NIF / CIF / DNI</Label>
                <Input
                  value={editForm.nif}
                  onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                  className="bg-muted border-border h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className="bg-muted border-border h-12"
                />
              </div>

              {/* Address Section */}
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" />
                  Dirección
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Dirección completa</Label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="bg-muted border-border h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Código Postal</Label>
                      <Input
                        value={editForm.postal_code}
                        onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                        className="bg-muted border-border h-12"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ciudad</Label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="bg-muted border-border h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Provincia</Label>
                      <Input
                        value={editForm.province}
                        onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                        className="bg-muted border-border h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>País</Label>
                      <Input
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="bg-muted border-border h-12"
                      />
                    </div>
                  </div>
                </div>
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
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t border-border">
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

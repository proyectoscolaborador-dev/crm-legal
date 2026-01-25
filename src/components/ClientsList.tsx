import { Client, WorkWithClient } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mail, Building2, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ClientsListProps {
  clients: Client[];
  works: WorkWithClient[];
  onDeleteClient: (id: string) => void;
}

export function ClientsList({ clients, works, onDeleteClient }: ClientsListProps) {
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email?.toLowerCase().includes(search.toLowerCase()) ||
    client.company?.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..."
          className="pl-10 bg-muted border-border"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteClient(client.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
          <p className="text-muted-foreground">No se encontraron clientes</p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Client, WorkStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, User } from 'lucide-react';

interface CreateWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onCreateWork: (work: {
    client_id: string;
    title: string;
    description: string | null;
    amount: number;
    status: WorkStatus;
    position: number;
  }) => void;
  onCreateClient: (client: { name: string; email: string | null; phone: string | null; company: string | null; notes: string | null }) => void;
}

export function CreateWorkModal({
  isOpen,
  onClose,
  clients,
  onCreateWork,
  onCreateClient,
}: CreateWorkModalProps) {
  const [step, setStep] = useState<'work' | 'new-client'>('work');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  const resetForm = () => {
    setStep('work');
    setSelectedClientId('');
    setTitle('');
    setDescription('');
    setAmount('');
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCompany('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateWork = () => {
    if (!selectedClientId || !title) return;

    onCreateWork({
      client_id: selectedClientId,
      title,
      description: description || null,
      amount: parseFloat(amount) || 0,
      status: 'presupuesto_solicitado',
      position: 0,
    });

    handleClose();
  };

  const handleCreateClient = () => {
    if (!newClientName) return;

    onCreateClient({
      name: newClientName,
      email: newClientEmail || null,
      phone: newClientPhone || null,
      company: newClientCompany || null,
      notes: null,
    });

    // Reset client form and go back
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCompany('');
    setStep('work');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        {step === 'work' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo Trabajo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="flex-1 bg-muted border-border">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStep('new-client')}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título del trabajo</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Diseño web corporativo"
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles del trabajo..."
                  className="bg-muted border-border resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Monto (€)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateWork}
                disabled={!selectedClientId || !title}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Crear Trabajo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <User className="w-5 h-5" />
                Nuevo Cliente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nombre completo"
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('work')}>
                Volver
              </Button>
              <Button
                onClick={handleCreateClient}
                disabled={!newClientName}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Crear Cliente
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

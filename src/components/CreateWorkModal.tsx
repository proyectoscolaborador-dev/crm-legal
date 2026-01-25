import { useState } from 'react';
import { Client, WorkStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, User, Loader2 } from 'lucide-react';

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
  onCreateClient: (client: { name: string; email: string | null; phone: string | null; company: string | null; notes: string | null }) => Promise<Client> | void;
  isLoading?: boolean;
}

export function CreateWorkModal({
  isOpen,
  onClose,
  clients,
  onCreateWork,
  onCreateClient,
  isLoading = false,
}: CreateWorkModalProps) {
  const [step, setStep] = useState<'work' | 'new-client'>('work');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  // Manual client entry (no preselection required)
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientCompany, setManualClientCompany] = useState('');
  const [saveToAgenda, setSaveToAgenda] = useState(false);
  
  // New client form step
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const resetForm = () => {
    setStep('work');
    setSelectedClientId('');
    setTitle('');
    setDescription('');
    setAmount('');
    setManualClientName('');
    setManualClientEmail('');
    setManualClientPhone('');
    setManualClientCompany('');
    setSaveToAgenda(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCompany('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // When selecting an existing client, populate manual fields
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setManualClientName(client.name);
      setManualClientEmail(client.email || '');
      setManualClientPhone(client.phone || '');
      setManualClientCompany(client.company || '');
    }
  };

  const handleCreateWork = async () => {
    if (!title || !manualClientName) return;

    let clientId = selectedClientId;

    // If saving to agenda and it's a new manual entry (not selected from list)
    if (saveToAgenda && !selectedClientId && manualClientName) {
      try {
        const result = await Promise.resolve(onCreateClient({
          name: manualClientName,
          email: manualClientEmail || null,
          phone: manualClientPhone || null,
          company: manualClientCompany || null,
          notes: null,
        }));
        if (result && typeof result === 'object' && 'id' in result) {
          clientId = result.id;
        }
      } catch (e) {
        console.error('Error creating client:', e);
      }
    }

    // If no client selected and not saving, create temporary client anyway
    if (!clientId && manualClientName) {
      try {
        const result = await Promise.resolve(onCreateClient({
          name: manualClientName,
          email: manualClientEmail || null,
          phone: manualClientPhone || null,
          company: manualClientCompany || null,
          notes: saveToAgenda ? null : 'Cliente temporal - no guardado en agenda',
        }));
        if (result && typeof result === 'object' && 'id' in result) {
          clientId = result.id;
        }
      } catch (e) {
        console.error('Error creating client:', e);
      }
    }

    // Small delay to ensure client is created
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the latest client list after potential creation
    const targetClient = clients.find(c => c.name === manualClientName);
    const finalClientId = clientId || targetClient?.id;

    if (!finalClientId) {
      console.error('Could not get client ID');
      return;
    }

    onCreateWork({
      client_id: finalClientId,
      title,
      description: description || null,
      amount: parseFloat(amount) || 0,
      status: 'presupuesto_solicitado',
      position: 0,
    });

    handleClose();
  };

  const handleCreateClientStep = async () => {
    if (!newClientName) return;
    
    setCreatingClient(true);
    try {
      await Promise.resolve(onCreateClient({
        name: newClientName,
        email: newClientEmail || null,
        phone: newClientPhone || null,
        company: newClientCompany || null,
        notes: null,
      }));

      // Populate manual fields with new client data
      setManualClientName(newClientName);
      setManualClientEmail(newClientEmail);
      setManualClientPhone(newClientPhone);
      setManualClientCompany(newClientCompany);

      // Reset new client form and go back
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientCompany('');
      setStep('work');
    } finally {
      setCreatingClient(false);
    }
  };

  const isFormValid = title && manualClientName;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'work' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo Trabajo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Client Selection - Optional */}
              {clients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Seleccionar cliente existente (opcional)</Label>
                  <div className="flex gap-2">
                    <Select value={selectedClientId} onValueChange={handleClientSelect}>
                      <SelectTrigger className="flex-1 bg-muted border-border">
                        <SelectValue placeholder="Elegir de la agenda..." />
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
                      title="Crear nuevo cliente"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Client Fields - Always editable */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Datos del cliente
                </p>
                
                <div className="space-y-2">
                  <Label>Nombre del cliente *</Label>
                  <Input
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="Nombre completo"
                    className="bg-muted border-border h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={manualClientEmail}
                      onChange={(e) => setManualClientEmail(e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="bg-muted border-border h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={manualClientPhone}
                      onChange={(e) => setManualClientPhone(e.target.value)}
                      placeholder="+34 600..."
                      className="bg-muted border-border h-12"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    value={manualClientCompany}
                    onChange={(e) => setManualClientCompany(e.target.value)}
                    placeholder="Nombre de la empresa"
                    className="bg-muted border-border h-12"
                  />
                </div>

                {/* Save to Agenda Checkbox */}
                {!selectedClientId && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="saveToAgenda"
                      checked={saveToAgenda}
                      onCheckedChange={(checked) => setSaveToAgenda(!!checked)}
                    />
                    <label
                      htmlFor="saveToAgenda"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Guardar cliente en la agenda
                    </label>
                  </div>
                )}
              </div>

              {/* Work Details */}
              <div className="space-y-2">
                <Label>Título del trabajo *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Diseño web corporativo"
                  className="bg-muted border-border h-12"
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
                <Label>Monto estimado (€)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-muted border-border h-12"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateWork}
                disabled={!isFormValid || isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Trabajo'
                )}
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
                  className="bg-muted border-border h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="bg-muted border-border h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="bg-muted border-border h-12"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="bg-muted border-border h-12"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('work')}>
                Volver
              </Button>
              <Button
                onClick={handleCreateClientStep}
                disabled={!newClientName || creatingClient}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {creatingClient ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Cliente'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
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
import { Plus, Loader2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '@/components/ImageUpload';

// Extended work data including client fields for direct presupuesto sync
export interface WorkWithClientData {
  client_id: string;
  title: string;
  description: string | null;
  amount: number;
  status: WorkStatus;
  position: number;
  images: string[];
  // Client data for direct presupuesto population (avoids lookup timing issues)
  clientData: {
    name: string;
    email: string | null;
    phone: string | null;
    nif: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    province: string | null;
  };
}

interface CreateWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onCreateWork: (work: WorkWithClientData) => void;
  onCreateClient: (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Client> | void;
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
  const [step, setStep] = useState<'images' | 'work' | 'new-client'>('images');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [showAddressFields, setShowAddressFields] = useState(false);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  
  // Manual client entry (no preselection required)
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientCompany, setManualClientCompany] = useState('');
  const [manualClientNif, setManualClientNif] = useState('');
  const [manualClientAddress, setManualClientAddress] = useState('');
  const [manualClientPostalCode, setManualClientPostalCode] = useState('');
  const [manualClientCity, setManualClientCity] = useState('');
  const [manualClientProvince, setManualClientProvince] = useState('');
  const [manualClientCountry, setManualClientCountry] = useState('España');
  const [saveToAgenda, setSaveToAgenda] = useState(false);
  
  // New client form step
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientNif, setNewClientNif] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const resetForm = () => {
    setStep('images');
    setSelectedClientId('');
    setTitle('');
    setDescription('');
    setAmount('');
    setShowAddressFields(false);
    setProjectImages([]);
    setManualClientName('');
    setManualClientEmail('');
    setManualClientPhone('');
    setManualClientCompany('');
    setManualClientNif('');
    setManualClientAddress('');
    setManualClientPostalCode('');
    setManualClientCity('');
    setManualClientProvince('');
    setManualClientCountry('España');
    setSaveToAgenda(false);
    setNewClientName('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientCompany('');
    setNewClientNif('');
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
      setManualClientNif(client.nif || '');
      setManualClientAddress(client.address || '');
      setManualClientPostalCode(client.postal_code || '');
      setManualClientCity(client.city || '');
      setManualClientProvince(client.province || '');
      setManualClientCountry(client.country || 'España');
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
          nif: manualClientNif || null,
          address: manualClientAddress || null,
          postal_code: manualClientPostalCode || null,
          city: manualClientCity || null,
          province: manualClientProvince || null,
          country: manualClientCountry || null,
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
          nif: manualClientNif || null,
          address: manualClientAddress || null,
          postal_code: manualClientPostalCode || null,
          city: manualClientCity || null,
          province: manualClientProvince || null,
          country: manualClientCountry || null,
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

    // Pass current form data directly - avoids cache timing issues
    onCreateWork({
      client_id: finalClientId,
      title,
      description: description || null,
      amount: parseFloat(amount) || 0,
      status: 'presupuesto_solicitado',
      position: 0,
      images: projectImages,
      clientData: {
        name: manualClientName,
        email: manualClientEmail || null,
        phone: manualClientPhone || null,
        nif: manualClientNif || null,
        address: manualClientAddress || null,
        postal_code: manualClientPostalCode || null,
        city: manualClientCity || null,
        province: manualClientProvince || null,
      },
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
        nif: newClientNif || null,
        address: null,
        postal_code: null,
        city: null,
        province: null,
        country: 'España',
      }));

      // Populate manual fields with new client data
      setManualClientName(newClientName);
      setManualClientEmail(newClientEmail);
      setManualClientPhone(newClientPhone);
      setManualClientCompany(newClientCompany);
      setManualClientNif(newClientNif);

      // Reset new client form and go back
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientCompany('');
      setNewClientNif('');
      setStep('work');
    } finally {
      setCreatingClient(false);
    }
  };

  const isFormValid = title && manualClientName;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] p-0">
        {/* Step 1: Images */}
        {step === 'images' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-foreground">Nuevo Trabajo - Imágenes</DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Sube imágenes del proyecto (opcional). Puedes añadirlas ahora o más tarde.
              </p>
              
              <ImageUpload
                images={projectImages}
                onImagesChange={setProjectImages}
                maxImages={5}
              />
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('work')}>
                {projectImages.length > 0 ? 'Continuar' : 'Saltar'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Work Details */}
        {step === 'work' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-foreground">Nuevo Trabajo - Detalles</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] px-6">
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
                              {client.name} {client.nif ? `(${client.nif})` : ''}
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

                  <div className="space-y-2">
                    <Label>NIF / CIF / DNI</Label>
                    <Input
                      value={manualClientNif}
                      onChange={(e) => setManualClientNif(e.target.value)}
                      placeholder="B12345678"
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

                  {/* Expandable Address Fields */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground"
                    onClick={() => setShowAddressFields(!showAddressFields)}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Añadir dirección
                    </span>
                    {showAddressFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {showAddressFields && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label>Dirección</Label>
                        <Input
                          value={manualClientAddress}
                          onChange={(e) => setManualClientAddress(e.target.value)}
                          placeholder="Calle, número, piso..."
                          className="bg-muted border-border h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Código Postal</Label>
                          <Input
                            value={manualClientPostalCode}
                            onChange={(e) => setManualClientPostalCode(e.target.value)}
                            placeholder="28001"
                            className="bg-muted border-border h-12"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ciudad</Label>
                          <Input
                            value={manualClientCity}
                            onChange={(e) => setManualClientCity(e.target.value)}
                            placeholder="Madrid"
                            className="bg-muted border-border h-12"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Provincia</Label>
                          <Input
                            value={manualClientProvince}
                            onChange={(e) => setManualClientProvince(e.target.value)}
                            placeholder="Madrid"
                            className="bg-muted border-border h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>País</Label>
                          <Input
                            value={manualClientCountry}
                            onChange={(e) => setManualClientCountry(e.target.value)}
                            placeholder="España"
                            className="bg-muted border-border h-12"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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
                    placeholder="Ej: Reforma integral cocina"
                    className="bg-muted border-border h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles del trabajo..."
                    className="bg-muted border-border min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Importe estimado (€)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-muted border-border h-12"
                  />
                </div>

                {/* Images preview */}
                {projectImages.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">
                      {projectImages.length} imagen(es) adjuntadas
                    </p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setStep('images')}
                    >
                      Modificar imágenes
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 pt-0 gap-2">
              <Button variant="outline" onClick={() => setStep('images')}>
                Atrás
              </Button>
              <Button 
                onClick={handleCreateWork} 
                disabled={!isFormValid || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Trabajo'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step: New Client Form */}
        {step === 'new-client' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-foreground">Nuevo Cliente</DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] px-6">
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
                  <Label>NIF / CIF / DNI</Label>
                  <Input
                    value={newClientNif}
                    onChange={(e) => setNewClientNif(e.target.value)}
                    placeholder="B12345678"
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
                    placeholder="+34 600..."
                    className="bg-muted border-border h-12"
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
            </ScrollArea>

            <DialogFooter className="p-6 pt-0 gap-2">
              <Button variant="outline" onClick={() => setStep('work')}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateClientStep} 
                disabled={!newClientName || creatingClient}
                className="gap-2"
              >
                {creatingClient ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear y Usar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

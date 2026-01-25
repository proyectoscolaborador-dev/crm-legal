import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClient: (client: {
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
    nif: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
  }) => void;
}

export function NewClientModal({ isOpen, onClose, onCreateClient }: NewClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('España');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setNif('');
    setAddress('');
    setPostalCode('');
    setCity('');
    setProvince('');
    setCountry('España');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onCreateClient({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      nif: nif.trim() || null,
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      country: country.trim() || null,
      notes: notes.trim() || null,
    });

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Nuevo Cliente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre completo o razón social"
                className="bg-muted border-border h-12"
              />
            </div>

            <div className="space-y-2">
              <Label>NIF / CIF / DNI</Label>
              <Input
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="B12345678"
                className="bg-muted border-border h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="bg-muted border-border h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="bg-muted border-border h-12"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de la empresa"
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
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, piso..."
                    className="bg-muted border-border h-12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Código Postal</Label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="28001"
                      className="bg-muted border-border h-12"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Madrid"
                      className="bg-muted border-border h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Provincia</Label>
                    <Input
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Madrid"
                      className="bg-muted border-border h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="España"
                      className="bg-muted border-border h-12"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas del cliente</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales, preferencias, historial..."
                className="bg-muted border-border resize-none"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t border-border">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Crear Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

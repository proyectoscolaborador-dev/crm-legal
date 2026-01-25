import { useState } from 'react';
import { WorkWithClient, Client } from '@/types/database';
import { useWorks } from '@/hooks/useWorks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  Mail, 
  Building2, 
  MessageSquare, 
  FileText, 
  Star,
  DollarSign,
  Calendar,
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClientPanelProps {
  work: WorkWithClient | null;
  allWorks: WorkWithClient[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateWork: (updates: Partial<WorkWithClient> & { id: string }) => void;
}

export function ClientPanel({ work, allWorks, isOpen, onClose, onUpdateWork }: ClientPanelProps) {
  const { markAsPaid } = useWorks();
  const [editedWork, setEditedWork] = useState<Partial<WorkWithClient>>({});

  if (!work) return null;

  const client = work.client;

  // Calculate LTV
  const clientWorks = allWorks.filter(w => w.client_id === work.client_id);
  const ltv = clientWorks
    .filter(w => w.is_paid)
    .reduce((sum, w) => sum + Number(w.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const openWhatsApp = (message: string = '') => {
    if (!client?.phone) {
      toast.error('El cliente no tiene número de teléfono');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleGeneratePDF = () => {
    // Generate a simple budget text for now
    const budgetText = `
PRESUPUESTO

Cliente: ${client?.name}
Empresa: ${client?.company || 'N/A'}
Fecha: ${format(new Date(), 'dd/MM/yyyy')}

Concepto: ${work.title}
${work.description ? `Descripción: ${work.description}` : ''}

Importe: ${formatCurrency(Number(work.amount))}

---
Presupuesto generado con Copiloto
    `.trim();

    const blob = new Blob([budgetText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-${work.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Presupuesto generado');
  };

  const handleRequestReview = () => {
    const reviewLink = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review';
    const message = `¡Hola ${client?.name}! 🙌\n\nEsperamos que estés muy contento/a con el trabajo realizado. Nos encantaría que nos dejaras una reseña en Google, nos ayuda muchísimo:\n\n${reviewLink}\n\n¡Muchas gracias! 🙏`;
    openWhatsApp(message);
  };

  const handleSave = () => {
    if (Object.keys(editedWork).length > 0) {
      onUpdateWork({ id: work.id, ...editedWork });
      setEditedWork({});
    }
  };

  const handleMarkAsPaid = () => {
    markAsPaid.mutate(work.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-foreground">
              {client?.name || 'Cliente'}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {client?.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {client.company}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue="contact" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="contact">Contacto</TabsTrigger>
            <TabsTrigger value="finances">Finanzas</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="space-y-4 mt-4">
            {/* Contact Info */}
            <div className="space-y-3">
              {client?.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{client.email}</span>
                </div>
              )}
              
              {client?.phone && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{client.phone}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => openWhatsApp()}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>
              )}
            </div>

            {/* LTV */}
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">Life Time Value</span>
              </div>
              <p className="text-2xl font-bold gradient-text">{formatCurrency(ltv)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {clientWorks.filter(w => w.is_paid).length} trabajo(s) pagado(s)
              </p>
            </div>

            {/* Notes */}
            {client?.notes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm text-foreground">{client.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finances" className="space-y-4 mt-4">
            {/* Current Work Info */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Trabajo Actual</p>
                <p className="font-medium text-foreground">{work.title}</p>
                {work.description && (
                  <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Monto</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <Input
                      type="number"
                      value={editedWork.amount ?? work.amount}
                      onChange={(e) => setEditedWork({ ...editedWork, amount: parseFloat(e.target.value) })}
                      className="bg-muted border-border"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Nº Factura</Label>
                  <Input
                    value={editedWork.invoice_number ?? work.invoice_number ?? ''}
                    onChange={(e) => setEditedWork({ ...editedWork, invoice_number: e.target.value })}
                    placeholder="FAC-001"
                    className="bg-muted border-border mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Fecha de Vencimiento</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <Input
                    type="date"
                    value={editedWork.due_date ?? work.due_date ?? ''}
                    onChange={(e) => setEditedWork({ ...editedWork, due_date: e.target.value })}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              {Object.keys(editedWork).length > 0 && (
                <Button onClick={handleSave} className="w-full">
                  Guardar Cambios
                </Button>
              )}
            </div>

            {/* Payment Status */}
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Estado de Pago</p>
                  <p className={`text-xs ${work.is_paid ? 'text-secondary' : 'text-warning'}`}>
                    {work.is_paid ? 'Pagado' : 'Pendiente de pago'}
                  </p>
                </div>
                {!work.is_paid && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-secondary text-secondary hover:bg-secondary/10"
                    onClick={handleMarkAsPaid}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Pagado
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handleGeneratePDF}
            >
              <FileText className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Generar PDF de Presupuesto</p>
                <p className="text-xs text-muted-foreground">Exportar como documento</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handleRequestReview}
            >
              <Star className="w-5 h-5 text-warning" />
              <div className="text-left">
                <p className="font-medium">Solicitar Reseña Google</p>
                <p className="text-xs text-muted-foreground">Enviar por WhatsApp</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => openWhatsApp(`Hola ${client?.name}, te escribo sobre el trabajo "${work.title}"...`)}
            >
              <MessageSquare className="w-5 h-5 text-secondary" />
              <div className="text-left">
                <p className="font-medium">Contactar por WhatsApp</p>
                <p className="text-xs text-muted-foreground">Abrir conversación</p>
              </div>
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

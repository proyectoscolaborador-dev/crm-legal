export type WorkStatus = 
  | 'presupuesto_solicitado'
  | 'presupuesto_enviado'
  | 'presupuesto_aceptado'
  | 'pendiente_facturar'
  | 'factura_enviada'
  | 'trabajo_terminado'
  | 'cobrado';

export interface Client {
  id: string;
  user_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface Work {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  amount: number;
  invoice_number: string | null;
  due_date: string | null;
  status: WorkStatus;
  is_paid: boolean;
  budget_sent_at: string | null;
  budget_responded_at: string | null;
  position: number;
  advance_payments: number;
  images: string[];
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface WorkWithClient extends Work {
  client: Client;
}

// New stage order for vertical layout
export const STAGE_ORDER: WorkStatus[] = [
  'presupuesto_solicitado',    // Nuevos trabajos
  'presupuesto_enviado',        // Presupuestos enviados
  'presupuesto_aceptado',       // En obra
  'pendiente_facturar',         // Pendientes de facturar
  'factura_enviada',            // Facturados
  'cobrado',                    // Cobrados
];

// Stage configuration with labels and colors
export const STAGE_CONFIG: Record<WorkStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  presupuesto_solicitado: { 
    label: 'Nuevos Trabajos', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted/50 hover:bg-muted/70',
    icon: 'plus-circle'
  },
  presupuesto_enviado: { 
    label: 'Presupuestos Enviados', 
    color: 'text-primary', 
    bgColor: 'bg-primary/10 hover:bg-primary/20',
    icon: 'send'
  },
  presupuesto_aceptado: { 
    label: 'En Obra', 
    color: 'text-warning', 
    bgColor: 'bg-warning/10 hover:bg-warning/20',
    icon: 'hard-hat'
  },
  pendiente_facturar: { 
    label: 'Pendientes de Facturar', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    icon: 'file-text'
  },
  factura_enviada: { 
    label: 'Facturados', 
    color: 'text-purple-500', 
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    icon: 'receipt'
  },
  trabajo_terminado: { 
    label: 'Terminado', 
    color: 'text-secondary', 
    bgColor: 'bg-secondary/10 hover:bg-secondary/20',
    icon: 'check-circle'
  },
  cobrado: { 
    label: 'Cobrados', 
    color: 'text-emerald-500', 
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    icon: 'wallet'
  },
};

// Deprecated - keeping for backwards compatibility
export const COLUMN_COLORS: Record<WorkStatus, string> = {
  presupuesto_solicitado: 'bg-muted/50',
  presupuesto_enviado: 'bg-primary/10',
  presupuesto_aceptado: 'bg-warning/10',
  pendiente_facturar: 'bg-orange-500/10',
  factura_enviada: 'bg-purple-500/10',
  trabajo_terminado: 'bg-success/10',
  cobrado: 'bg-emerald-500/10',
};

export const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string }> = {
  presupuesto_solicitado: { label: 'Nuevos Trabajos', color: 'bg-muted' },
  presupuesto_enviado: { label: 'Presupuestos Enviados', color: 'bg-primary/20' },
  presupuesto_aceptado: { label: 'En Obra', color: 'bg-warning/20' },
  pendiente_facturar: { label: 'Pendientes de Facturar', color: 'bg-orange-500/20' },
  factura_enviada: { label: 'Facturados', color: 'bg-purple-500/20' },
  trabajo_terminado: { label: 'Terminado', color: 'bg-success/20' },
  cobrado: { label: 'Cobrados', color: 'bg-emerald-500/20' },
};

// Main display stages (excluding terminado which is legacy)
export const COLUMNS: WorkStatus[] = [
  'presupuesto_solicitado',
  'presupuesto_enviado',
  'presupuesto_aceptado',
  'factura_enviada',
];

// All columns including history
export const ALL_COLUMNS: WorkStatus[] = [
  'presupuesto_solicitado',
  'presupuesto_enviado',
  'presupuesto_aceptado',
  'pendiente_facturar',
  'factura_enviada',
  'trabajo_terminado',
  'cobrado',
];

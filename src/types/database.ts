export type WorkStatus = 
  | 'presupuesto_solicitado'
  | 'presupuesto_enviado'
  | 'presupuesto_aceptado'
  | 'factura_enviada'
  | 'trabajo_terminado';

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
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface WorkWithClient extends Work {
  client: Client;
}

// Column background colors for Kanban (using semantic tokens)
export const COLUMN_COLORS: Record<WorkStatus, string> = {
  presupuesto_solicitado: 'bg-muted/50',          // Gris - Nuevos
  presupuesto_enviado: 'bg-primary/10',            // Azul cian - Enviados
  presupuesto_aceptado: 'bg-warning/10',           // Naranja - En Obra/Aceptados
  factura_enviada: 'bg-purple-500/10',             // Violeta - Facturación
  trabajo_terminado: 'bg-success/10',              // Verde - Terminados (solo historial)
};

export const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string }> = {
  presupuesto_solicitado: { label: 'Nuevos Trabajos', color: 'bg-muted' },
  presupuesto_enviado: { label: 'Presupuestos Enviados', color: 'bg-primary/20' },
  presupuesto_aceptado: { label: 'En Obra', color: 'bg-warning/20' },
  factura_enviada: { label: 'Facturación', color: 'bg-purple-500/20' },
  trabajo_terminado: { label: 'Terminado', color: 'bg-success/20' },
};

// Main Kanban columns (excluding finished/paid - those go to History)
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
  'factura_enviada',
  'trabajo_terminado',
];

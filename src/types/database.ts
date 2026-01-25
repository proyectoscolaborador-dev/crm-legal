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

export const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string }> = {
  presupuesto_solicitado: { label: 'Presupuesto Solicitado', color: 'bg-muted' },
  presupuesto_enviado: { label: 'Presupuesto Enviado', color: 'bg-primary/20' },
  presupuesto_aceptado: { label: 'Presupuesto Aceptado', color: 'bg-secondary/20' },
  factura_enviada: { label: 'Factura Enviada', color: 'bg-warning/20' },
  trabajo_terminado: { label: 'Trabajo Terminado', color: 'bg-success/20' },
};

export const COLUMNS: WorkStatus[] = [
  'presupuesto_solicitado',
  'presupuesto_enviado',
  'presupuesto_aceptado',
  'factura_enviada',
  'trabajo_terminado',
];

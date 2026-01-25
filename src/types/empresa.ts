export interface EmpresaUsuario {
  id: string;
  user_id: string;
  empresa_nombre: string;
  empresa_razon_social: string | null;
  empresa_cif: string;
  empresa_direccion: string;
  empresa_cp: string;
  empresa_ciudad: string;
  empresa_provincia: string;
  empresa_telefono: string;
  empresa_email: string;
  empresa_web: string | null;
  empresa_logo_url: string | null;
  condiciones_generales: string | null;
  created_at: string;
  updated_at: string;
}

export interface Partida {
  concepto: string;
  cantidad: number;
  precio_unidad: number;
  importe_linea: number;
}

export interface Presupuesto {
  id: string;
  user_id: string;
  numero_presupuesto: string;
  cliente_nombre: string;
  cliente_email: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  cliente_cp: string | null;
  cliente_ciudad: string | null;
  cliente_provincia: string | null;
  descripcion_trabajo_larga: string | null;
  obra_titulo: string;
  partidas: Partida[];
  subtotal: number;
  iva_porcentaje: number;
  iva_importe: number;
  total_presupuesto: number;
  estado_presupuesto: 'borrador' | 'enviado' | 'aceptado' | 'rechazado';
  fecha_presupuesto: string;
  validez_dias: number;
  comercial_nombre: string | null;
  pdf_url: string | null;
  work_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EmpresaFormData = Omit<EmpresaUsuario, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type PresupuestoFormData = Omit<Presupuesto, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'subtotal' | 'iva_importe' | 'total_presupuesto' | 'pdf_url'>;

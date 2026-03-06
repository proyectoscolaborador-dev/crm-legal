import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/externalSupabase';
import { Presupuesto, PresupuestoFormData, PresupuestoUpdateData, Partida } from '@/types/empresa';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

// Helper to parse partidas from JSON
const parsePresupuesto = (data: Record<string, unknown>): Presupuesto => ({
  ...data,
  partidas: (data.partidas as Partida[]) || [],
} as Presupuesto);

export function usePresupuestos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = user?.id || DEFAULT_USER_ID;

  const { data: presupuestos = [], isLoading } = useQuery({
    queryKey: ['presupuestos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(parsePresupuesto);
    },
  });

  const createPresupuesto = useMutation({
    mutationFn: async (formData: PresupuestoFormData) => {
      // Calculate totals
      const partidas = formData.partidas || [];
      const subtotal = partidas.reduce((sum: number, p: Partida) => sum + (p.importe_linea || 0), 0);
      const iva_importe = subtotal * (formData.iva_porcentaje || 21) / 100;
      const total_presupuesto = subtotal + iva_importe;

      const insertData = {
        numero_presupuesto: formData.numero_presupuesto,
        cliente_nombre: formData.cliente_nombre,
        cliente_nif: formData.cliente_nif || null,
        cliente_email: formData.cliente_email || null,
        cliente_telefono: formData.cliente_telefono || null,
        cliente_direccion: formData.cliente_direccion || null,
        cliente_cp: formData.cliente_cp || null,
        cliente_ciudad: formData.cliente_ciudad || null,
        cliente_provincia: formData.cliente_provincia || null,
        descripcion_trabajo_larga: formData.descripcion_trabajo_larga || null,
        obra_titulo: formData.obra_titulo,
        partidas: JSON.parse(JSON.stringify(formData.partidas)),
        iva_porcentaje: formData.iva_porcentaje,
        estado_presupuesto: formData.estado_presupuesto,
        fecha_presupuesto: formData.fecha_presupuesto,
        validez_dias: formData.validez_dias,
        comercial_nombre: formData.comercial_nombre || null,
        work_id: formData.work_id || null,
        user_id: effectiveUserId,
        subtotal,
        iva_importe,
        total_presupuesto,
      };

      const { data, error } = await supabase
        .from('presupuestos')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return parsePresupuesto(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
    },
    onError: (error) => {
      console.error('Error creating presupuesto:', error);
      throw error;
    },
  });

  const updatePresupuesto = useMutation({
    mutationFn: async (updateData: PresupuestoUpdateData) => {
      const { id, ...formData } = updateData;
      
      let updates: Record<string, unknown> = { ...formData };
      
      if (formData.partidas) {
        const partidas = formData.partidas;
        updates.partidas = partidas as unknown as Record<string, unknown>;
        const subtotal = partidas.reduce((sum: number, p: Partida) => sum + (p.importe_linea || 0), 0);
        const iva_porcentaje = formData.iva_porcentaje || 21;
        const iva_importe = subtotal * iva_porcentaje / 100;
        const total_presupuesto = subtotal + iva_importe;
        
        updates = { ...updates, subtotal, iva_importe, total_presupuesto };
      }

      const { data, error } = await supabase
        .from('presupuestos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return parsePresupuesto(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
    },
    onError: (error) => {
      console.error('Error updating presupuesto:', error);
      throw error;
    },
  });

  const deletePresupuesto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presupuestos'] });
      toast.success('Presupuesto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  const getNextNumero = () => {
    const year = new Date().getFullYear();
    const count = presupuestos.filter(p => 
      p.numero_presupuesto.startsWith(`P-${year}`)
    ).length + 1;
    return `P-${year}-${String(count).padStart(4, '0')}`;
  };

  return {
    presupuestos,
    isLoading,
    createPresupuesto,
    updatePresupuesto,
    deletePresupuesto,
    getNextNumero,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/externalSupabase';
import { Work, WorkWithClient, WorkStatus } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export function useWorks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = user?.id || DEFAULT_USER_ID;

  const { data: works = [], isLoading } = useQuery({
    queryKey: ['works', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('works')
        .select(`
          *,
          client:clientes(*)
        `)
        .eq('user_id', effectiveUserId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(work => ({
        ...work,
        images: Array.isArray(work.images) ? work.images : [],
        advance_payments: work.advance_payments || 0,
      })) as WorkWithClient[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('works-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'works',
          filter: `user_id=eq.${effectiveUserId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['works'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, queryClient]);

  const createWork = useMutation({
    mutationFn: async (work: {
      client_id: string;
      title: string;
      description?: string | null;
      amount?: number;
      status?: WorkStatus;
      position?: number;
      images?: string[];
    }) => {
      const { data, error } = await supabase
        .from('works')
        .insert({ 
          ...work, 
          user_id: effectiveUserId,
          is_paid: false,
          images: work.images || [],
          advance_payments: 0,
        })
        .select(`
          *,
          client:clientes(*)
        `)
        .single();
      
      if (error) throw error;
      return data as WorkWithClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
    onError: (error) => {
      toast.error('Error al crear trabajo: ' + error.message);
    },
  });

  const updateWork = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Work> & { id: string }) => {
      const { data, error } = await supabase
        .from('works')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
    onError: (error) => {
      toast.error('Error al actualizar trabajo: ' + error.message);
    },
  });

  const updateWorkStatus = useMutation({
    mutationFn: async ({ id, status, position }: { id: string; status: WorkStatus; position: number }) => {
      const updates: Partial<Work> = { status, position };
      
      if (status === 'presupuesto_enviado') {
        updates.budget_sent_at = new Date().toISOString();
      }
      
      if (status === 'presupuesto_aceptado' || status === 'factura_enviada') {
        updates.budget_responded_at = new Date().toISOString();
      }

      if (status === 'cobrado') {
        updates.is_paid = true;
      }

      const { data, error } = await supabase
        .from('works')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
    },
    onError: (error) => {
      toast.error('Error al actualizar estado: ' + error.message);
    },
  });

  const deleteWork = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      toast.success('Trabajo eliminado correctamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar trabajo: ' + error.message);
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('works')
        .update({ is_paid: true, status: 'cobrado' as WorkStatus })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      toast.success('Trabajo marcado como cobrado');
    },
    onError: (error) => {
      toast.error('Error al marcar como pagado: ' + error.message);
    },
  });

  const updateAdvancePayment = useMutation({
    mutationFn: async ({ id, advance_payments }: { id: string; advance_payments: number }) => {
      const { data, error } = await supabase
        .from('works')
        .update({ advance_payments })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      toast.success('Anticipo actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar anticipo: ' + error.message);
    },
  });

  return {
    works,
    isLoading,
    createWork,
    updateWork,
    updateWorkStatus,
    deleteWork,
    markAsPaid,
    updateAdvancePayment,
  };
}

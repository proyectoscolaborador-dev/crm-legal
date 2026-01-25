import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Work, WorkWithClient, WorkStatus } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useWorks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: works = [], isLoading } = useQuery({
    queryKey: ['works', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('works')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('user_id', user.id)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as WorkWithClient[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('works-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'works',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['works'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createWork = useMutation({
    mutationFn: async (work: {
      client_id: string;
      title: string;
      description?: string | null;
      amount?: number;
      status?: WorkStatus;
      position?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('works')
        .insert({ 
          ...work, 
          user_id: user.id,
          is_paid: false,
        })
        .select(`
          *,
          client:clients(*)
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
      
      // Track when budget is sent
      if (status === 'presupuesto_enviado') {
        updates.budget_sent_at = new Date().toISOString();
      }
      
      // Track when budget gets response
      if (status === 'presupuesto_aceptado' || status === 'factura_enviada') {
        updates.budget_responded_at = new Date().toISOString();
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
        .update({ is_paid: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['works'] });
      toast.success('Trabajo marcado como pagado');
    },
    onError: (error) => {
      toast.error('Error al marcar como pagado: ' + error.message);
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
  };
}

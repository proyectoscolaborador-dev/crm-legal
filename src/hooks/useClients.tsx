import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/externalSupabase';
import { Client } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = user?.id || DEFAULT_USER_ID;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert({ ...client, user_id: effectiveUserId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente creado correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear cliente: ' + error.message);
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente actualizado correctamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar cliente: ' + error.message);
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente eliminado correctamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar cliente: ' + error.message);
    },
  });

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
}

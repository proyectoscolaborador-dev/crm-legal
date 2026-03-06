import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/externalSupabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  work_id: string | null;
  reminder_type: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = user?.id || DEFAULT_USER_ID;

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, queryClient]);

  const createReminder = useMutation({
    mutationFn: async (reminder: {
      title: string;
      description?: string | null;
      reminder_date: string;
      reminder_time?: string | null;
      work_id?: string | null;
      reminder_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert({ 
          ...reminder, 
          user_id: effectiveUserId,
          reminder_type: reminder.reminder_type || 'general',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio creado');
    },
    onError: (error) => {
      toast.error('Error al crear recordatorio: ' + error.message);
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reminder> & { id: string }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error) => {
      toast.error('Error al actualizar recordatorio: ' + error.message);
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar recordatorio: ' + error.message);
    },
  });

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio completado');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const todayReminders = reminders.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.reminder_date === today && !r.is_completed;
  });

  return {
    reminders,
    isLoading,
    createReminder,
    updateReminder,
    deleteReminder,
    markComplete,
    todayReminders,
  };
}

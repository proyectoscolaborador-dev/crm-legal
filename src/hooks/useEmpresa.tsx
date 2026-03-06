import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/externalSupabase';
import { EmpresaUsuario, EmpresaFormData } from '@/types/empresa';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export function useEmpresa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = user?.id || DEFAULT_USER_ID;

  const { data: empresa, isLoading, error } = useQuery({
    queryKey: ['empresa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresa_usuario')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as EmpresaUsuario | null;
    },
  });

  const saveEmpresa = useMutation({
    mutationFn: async (data: EmpresaFormData) => {
      const { data: existing } = await supabase
        .from('empresa_usuario')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabase
          .from('empresa_usuario')
          .update(data)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('empresa_usuario')
          .insert({ ...data, user_id: effectiveUserId })
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
      toast.success('Datos de empresa guardados correctamente');
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });

  const deleteEmpresa = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('No company data to delete');
      const { error } = await supabase
        .from('empresa_usuario')
        .delete()
        .eq('id', empresa.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
      toast.success('Datos de empresa eliminados');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${effectiveUserId}/logo_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('presupuestos-pdf')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('presupuestos-pdf')
        .getPublicUrl(fileName);
      
      return publicUrl;
    },
    onSuccess: () => {
      toast.success('Logo subido correctamente');
    },
    onError: (error) => {
      toast.error('Error al subir logo: ' + error.message);
    },
  });

  const isEmpresaComplete = empresa && 
    empresa.empresa_nombre &&
    empresa.empresa_cif &&
    empresa.empresa_direccion &&
    empresa.empresa_cp &&
    empresa.empresa_ciudad &&
    empresa.empresa_provincia &&
    empresa.empresa_telefono &&
    empresa.empresa_email;

  return {
    empresa,
    isLoading,
    error,
    saveEmpresa,
    deleteEmpresa,
    uploadLogo,
    isEmpresaComplete: !!isEmpresaComplete,
  };
}

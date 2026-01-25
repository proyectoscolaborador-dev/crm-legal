import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmpresaUsuario, EmpresaFormData } from '@/types/empresa';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useEmpresa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: empresa, isLoading, error } = useQuery({
    queryKey: ['empresa', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('empresa_usuario')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as EmpresaUsuario | null;
    },
    enabled: !!user,
  });

  const saveEmpresa = useMutation({
    mutationFn: async (data: EmpresaFormData) => {
      if (!user) throw new Error('No autenticado');
      
      // Check if empresa exists
      const { data: existing } = await supabase
        .from('empresa_usuario')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data: updated, error } = await supabase
          .from('empresa_usuario')
          .update(data)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        // Insert
        const { data: created, error } = await supabase
          .from('empresa_usuario')
          .insert({ ...data, user_id: user.id })
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

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('No autenticado');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('presupuestos-pdf')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('presupuestos-pdf')
        .getPublicUrl(fileName);
      
      return publicUrl;
    },
    onError: (error) => {
      toast.error('Error al subir logo: ' + error.message);
    },
  });

  // Check if empresa data is complete
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
    uploadLogo,
    isEmpresaComplete: !!isEmpresaComplete,
  };
}

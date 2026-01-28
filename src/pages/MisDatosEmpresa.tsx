import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmpresa } from '@/hooks/useEmpresa';
import { EmpresaFormData } from '@/types/empresa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Building2, Upload, Loader2, Save } from 'lucide-react';

export default function MisDatosEmpresa() {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa, isLoading, saveEmpresa, uploadLogo } = useEmpresa();
  
  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/';

  const [formData, setFormData] = useState<EmpresaFormData>({
    empresa_nombre: '',
    empresa_razon_social: '',
    empresa_cif: '',
    empresa_direccion: '',
    empresa_cp: '',
    empresa_ciudad: '',
    empresa_provincia: '',
    empresa_telefono: '',
    empresa_email: '',
    empresa_web: '',
    empresa_logo_url: '',
    condiciones_generales: '',
  });

  useEffect(() => {
    if (empresa) {
      setFormData({
        empresa_nombre: empresa.empresa_nombre || '',
        empresa_razon_social: empresa.empresa_razon_social || '',
        empresa_cif: empresa.empresa_cif || '',
        empresa_direccion: empresa.empresa_direccion || '',
        empresa_cp: empresa.empresa_cp || '',
        empresa_ciudad: empresa.empresa_ciudad || '',
        empresa_provincia: empresa.empresa_provincia || '',
        empresa_telefono: empresa.empresa_telefono || '',
        empresa_email: empresa.empresa_email || '',
        empresa_web: empresa.empresa_web || '',
        empresa_logo_url: empresa.empresa_logo_url || '',
        condiciones_generales: empresa.condiciones_generales || '',
      });
    }
  }, [empresa]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadLogo.mutateAsync(file);
    setFormData(prev => ({ ...prev, empresa_logo_url: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmpresa.mutateAsync(formData);
    navigate(returnTo);
  };

  const isFormValid = 
    formData.empresa_nombre &&
    formData.empresa_cif &&
    formData.empresa_direccion &&
    formData.empresa_cp &&
    formData.empresa_ciudad &&
    formData.empresa_provincia &&
    formData.empresa_telefono &&
    formData.empresa_email;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Mis Datos de Empresa</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Información de tu empresa</CardTitle>
            <CardDescription>
              Estos datos se usarán automáticamente en todos tus presupuestos y facturas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo de la empresa</Label>
                <div className="flex items-center gap-4">
                  {formData.empresa_logo_url && (
                    <img 
                      src={formData.empresa_logo_url} 
                      alt="Logo" 
                      className="h-16 w-auto object-contain rounded border border-border"
                    />
                  )}
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploadLogo.isPending}
                    >
                      {uploadLogo.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {formData.empresa_logo_url ? 'Cambiar logo' : 'Subir logo'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="empresa_nombre">Nombre comercial *</Label>
                  <Input
                    id="empresa_nombre"
                    name="empresa_nombre"
                    value={formData.empresa_nombre}
                    onChange={handleChange}
                    placeholder="Mi Empresa S.L."
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_razon_social">Razón social</Label>
                  <Input
                    id="empresa_razon_social"
                    name="empresa_razon_social"
                    value={formData.empresa_razon_social || ''}
                    onChange={handleChange}
                    placeholder="Mi Empresa Sociedad Limitada"
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_cif">CIF/NIF *</Label>
                  <Input
                    id="empresa_cif"
                    name="empresa_cif"
                    value={formData.empresa_cif}
                    onChange={handleChange}
                    placeholder="B12345678"
                    required
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="empresa_direccion">Dirección *</Label>
                  <Input
                    id="empresa_direccion"
                    name="empresa_direccion"
                    value={formData.empresa_direccion}
                    onChange={handleChange}
                    placeholder="Calle Principal, 123"
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_cp">Código Postal *</Label>
                  <Input
                    id="empresa_cp"
                    name="empresa_cp"
                    value={formData.empresa_cp}
                    onChange={handleChange}
                    placeholder="28001"
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_ciudad">Ciudad *</Label>
                  <Input
                    id="empresa_ciudad"
                    name="empresa_ciudad"
                    value={formData.empresa_ciudad}
                    onChange={handleChange}
                    placeholder="Madrid"
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_provincia">Provincia *</Label>
                  <Input
                    id="empresa_provincia"
                    name="empresa_provincia"
                    value={formData.empresa_provincia}
                    onChange={handleChange}
                    placeholder="Madrid"
                    required
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa_telefono">Teléfono *</Label>
                  <Input
                    id="empresa_telefono"
                    name="empresa_telefono"
                    value={formData.empresa_telefono}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_email">Email *</Label>
                  <Input
                    id="empresa_email"
                    name="empresa_email"
                    type="email"
                    value={formData.empresa_email}
                    onChange={handleChange}
                    placeholder="info@miempresa.com"
                    required
                    className="bg-muted border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empresa_web">Sitio web</Label>
                  <Input
                    id="empresa_web"
                    name="empresa_web"
                    value={formData.empresa_web || ''}
                    onChange={handleChange}
                    placeholder="www.miempresa.com"
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <Label htmlFor="condiciones_generales">Condiciones generales</Label>
                <Textarea
                  id="condiciones_generales"
                  name="condiciones_generales"
                  value={formData.condiciones_generales || ''}
                  onChange={handleChange}
                  placeholder="Texto que aparecerá al pie de tus presupuestos..."
                  rows={4}
                  className="bg-muted border-border resize-none"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground"
                disabled={!isFormValid || saveEmpresa.isPending}
              >
                {saveEmpresa.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar datos
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

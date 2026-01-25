import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (clients: Array<{
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
  }>) => void;
}

interface CSVRow {
  nombre?: string;
  name?: string;
  email?: string;
  correo?: string;
  telefono?: string;
  phone?: string;
  empresa?: string;
  company?: string;
  notas?: string;
  notes?: string;
}

export function ImportCSV({ isOpen, onClose, onImport }: ImportCSVProps) {
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        setIsLoading(false);
      },
      error: (error) => {
        toast.error('Error al leer el archivo: ' + error.message);
        setIsLoading(false);
      },
    });
  };

  const handleImport = () => {
    const clients = parsedData.map((row) => ({
      name: row.nombre || row.name || 'Sin nombre',
      email: row.email || row.correo || null,
      phone: row.telefono || row.phone || null,
      company: row.empresa || row.company || null,
      notes: row.notas || row.notes || null,
    }));

    onImport(clients);
    handleClose();
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Clientes desde CSV
          </DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con las columnas: nombre, email, telefono, empresa, notas
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />

          {!fileName ? (
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Haz clic para seleccionar un archivo CSV
              </p>
            </label>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} cliente(s) encontrado(s)
                  </p>
                </div>
              </div>

              {parsedData.length > 0 && (
                <div className="max-h-48 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground">Nombre</th>
                        <th className="text-left py-2 text-muted-foreground">Email</th>
                        <th className="text-left py-2 text-muted-foreground">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-b border-border/50">
                          <td className="py-2 text-foreground">
                            {row.nombre || row.name || '-'}
                          </td>
                          <td className="py-2 text-foreground">
                            {row.email || row.correo || '-'}
                          </td>
                          <td className="py-2 text-foreground">
                            {row.telefono || row.phone || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ... y {parsedData.length - 5} más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Importar {parsedData.length} cliente(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Upload, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  onNewWork: () => void;
  onImportCSV: () => void;
  onToggleMobileMenu?: () => void;
}

export function Header({ onNewWork, onImportCSV, onToggleMobileMenu }: HeaderProps) {
  const { signOut, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onToggleMobileMenu}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold gradient-text">Copiloto</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onImportCSV}
            className="gap-2 border-border text-foreground hover:bg-muted"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={onNewWork}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

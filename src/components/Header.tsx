import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Upload, LogOut, Menu, Building2, UserPlus, Bot, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onNewWork: () => void;
  onImportCSV: () => void;
  onNewClient?: () => void;
  onToggleMobileMenu?: () => void;
  onBack?: () => void;
}

export function Header({ onNewWork, onImportCSV, onNewClient, onToggleMobileMenu, onBack }: HeaderProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Button>
          )}
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
          {/* Copiloto AI Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/copiloto')}
            className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden md:inline">Copiloto IA</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mis-datos-empresa')}
            className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden md:inline">Mi Empresa</span>
          </Button>

          {onNewClient && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewClient}
              className="gap-2 border-secondary/50 text-secondary hover:bg-secondary/10"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Cliente</span>
            </Button>
          )}

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

          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

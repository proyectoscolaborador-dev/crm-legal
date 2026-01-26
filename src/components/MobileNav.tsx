import { Home, Calendar, Users, BarChart3, Archive } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onImportCSV: () => void;
}

export function MobileNav({ activeTab, onTabChange, onImportCSV }: MobileNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around p-2">
        <button
          onClick={() => onTabChange('inicio')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'inicio' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Inicio</span>
        </button>

        <button
          onClick={() => onTabChange('calendar')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'calendar' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Agenda</span>
        </button>

        <button
          onClick={() => onTabChange('clients')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'clients' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs">Clientes</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Archive className="w-5 h-5" />
          <span className="text-xs">Histórico</span>
        </button>

        <button
          onClick={() => onTabChange('analytics')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
            activeTab === 'analytics' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-xs">Analíticas</span>
        </button>
      </div>
    </div>
  );
}

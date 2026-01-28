import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MisDatosEmpresa from "./pages/MisDatosEmpresa";
import SimpleBudgetEditor from "./pages/SimpleBudgetEditor";
import Analytics from "./pages/Analytics";
import CopilotoCRM from "./pages/CopilotoCRM";
import AlertsPage from "./pages/AlertsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/mis-datos-empresa" element={<MisDatosEmpresa />} />
            <Route path="/presupuesto/nuevo" element={<SimpleBudgetEditor />} />
            <Route path="/presupuesto/:id" element={<SimpleBudgetEditor />} />
            <Route path="/analiticas" element={<Analytics />} />
            <Route path="/copiloto" element={<CopilotoCRM />} />
            <Route path="/alertas" element={<AlertsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

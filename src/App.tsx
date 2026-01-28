import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - require login */}
            <Route path="/" element={
              <ProtectedRoute>
                <Landing />
              </ProtectedRoute>
            } />
            <Route path="/mis-datos-empresa" element={
              <ProtectedRoute>
                <MisDatosEmpresa />
              </ProtectedRoute>
            } />
            <Route path="/presupuesto/nuevo" element={
              <ProtectedRoute>
                <SimpleBudgetEditor />
              </ProtectedRoute>
            } />
            <Route path="/presupuesto/:id" element={
              <ProtectedRoute>
                <SimpleBudgetEditor />
              </ProtectedRoute>
            } />
            <Route path="/analiticas" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/copiloto" element={
              <ProtectedRoute>
                <CopilotoCRM />
              </ProtectedRoute>
            } />
            <Route path="/alertas" element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

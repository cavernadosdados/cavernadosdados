import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Mesas from "./pages/Mesas";
import Explorar from "./pages/Explorar";
import MinhasAventuras from "./pages/MinhasAventuras";
import Mensagens from "./pages/Mensagens";
import Perfil from "./pages/Perfil";
import Tokens from "./pages/Tokens";
import Loja from "./pages/Loja";
import AreaPro from "./pages/AreaPro";
import Configuracoes from "./pages/Configuracoes";
import AdventurePanel from "./pages/AdventurePanel";
import MesaDetalhes from "./pages/MesaDetalhes";
import Notificacoes from "./pages/Notificacoes";
import AdminModeracao from "./pages/AdminModeracao";
import AdminCosmeticos from "./pages/AdminCosmeticos";
import Conquistas from "./pages/Conquistas";
import Calendario from "./pages/Calendario";
import NotFound from "./pages/NotFound";
import Financeiro from "./pages/Financeiro";
import Favoritos from "./pages/Favoritos";
import MesaPublica from "./pages/MesaPublica";
import Privacidade from "./pages/Privacidade";
import Termos from "./pages/Termos";
import Guia from "./pages/Guia";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/esqueci-senha" element={<EsqueciSenha />} />
    <Route path="/redefinir-senha" element={<RedefinirSenha />} />
    <Route path="/privacidade" element={<Privacidade />} />
    <Route path="/termos" element={<Termos />} />
    <Route path="/guia" element={<Guia />} />
    <Route path="/m/:tableId" element={<MesaPublica />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/dashboard/mesas" element={<ProtectedRoute><Mesas /></ProtectedRoute>} />
    <Route path="/dashboard/explorar" element={<ProtectedRoute><Explorar /></ProtectedRoute>} />
    <Route path="/dashboard/favoritos" element={<ProtectedRoute><Favoritos /></ProtectedRoute>} />
    <Route path="/dashboard/aventuras" element={<ProtectedRoute><MinhasAventuras /></ProtectedRoute>} />
    <Route path="/dashboard/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
    <Route path="/dashboard/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/dashboard/perfil/:userId" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/dashboard/tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
    <Route path="/dashboard/loja" element={<ProtectedRoute><Loja /></ProtectedRoute>} />
    <Route path="/dashboard/pro" element={<ProtectedRoute><AreaPro /></ProtectedRoute>} />
    <Route path="/dashboard/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
    <Route path="/dashboard/mesa/:tableId" element={<ProtectedRoute><AdventurePanel /></ProtectedRoute>} />
    <Route path="/dashboard/mesa/:tableId/detalhes" element={<ProtectedRoute><MesaDetalhes /></ProtectedRoute>} />
    <Route path="/dashboard/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
    <Route path="/dashboard/admin/moderacao" element={<ProtectedRoute><AdminModeracao /></ProtectedRoute>} />
    <Route path="/dashboard/admin/cosmeticos" element={<ProtectedRoute><AdminCosmeticos /></ProtectedRoute>} />
    <Route path="/dashboard/conquistas" element={<ProtectedRoute><Conquistas /></ProtectedRoute>} />
    <Route path="/dashboard/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
    <Route path="/dashboard/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

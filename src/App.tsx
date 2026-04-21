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
import AreaPro from "./pages/AreaPro";
import Configuracoes from "./pages/Configuracoes";
import AdventurePanel from "./pages/AdventurePanel";
import Notificacoes from "./pages/Notificacoes";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";

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

// Role-restricted route: redirects to /dashboard if user_type doesn't match
const RoleRoute = ({ children, allow }: { children: React.ReactNode; allow: "master" | "player" }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (!user) return <Navigate to="/auth" />;

  const userType = user.user_metadata?.user_type;
  if (userType !== allow) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/dashboard/mesas" element={<RoleRoute allow="master"><Mesas /></RoleRoute>} />
    <Route path="/dashboard/explorar" element={<ProtectedRoute><Explorar /></ProtectedRoute>} />
    <Route path="/dashboard/aventuras" element={<RoleRoute allow="player"><MinhasAventuras /></RoleRoute>} />
    <Route path="/dashboard/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
    <Route path="/dashboard/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/dashboard/perfil/:userId" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
    <Route path="/dashboard/tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
    <Route path="/dashboard/pro" element={<ProtectedRoute><AreaPro /></ProtectedRoute>} />
    <Route path="/dashboard/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
    <Route path="/dashboard/mesa/:tableId" element={<ProtectedRoute><AdventurePanel /></ProtectedRoute>} />
    <Route path="/dashboard/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

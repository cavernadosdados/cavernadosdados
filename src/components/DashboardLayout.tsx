import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlimerAvatar } from "@/components/GlimerAvatar";
import { useNavigate } from "react-router-dom";
import { NotificationsBell } from "@/components/NotificationsBell";
import { TokenBalance } from "@/components/TokenBalance";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-2xl">
                <SidebarTrigger className="text-foreground hover:text-primary shrink-0 h-10 w-10" />
                <div className="relative flex-1 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Procurar mestres, mesas ou sistemas..." 
                    className="pl-10 bg-input border-border"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="relative sm:hidden h-10 w-10" aria-label="Buscar">
                  <Search className="h-5 w-5" />
                </Button>
                <TokenBalance />
                <NotificationsBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <GlimerAvatar
                        userId={user?.id}
                        fallbackText={initials}
                        className="h-10 w-10"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard/perfil')}>
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/financeiro')}>
                      Financeiro
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/configuracoes')}>
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto max-w-screen-xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

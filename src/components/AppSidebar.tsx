import { Home, Dice1, MessageCircle, User, Gem, Settings, Crown } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logoDragon from "@/assets/logo-dragon.png";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Minhas Mesas", url: "/dashboard/mesas", icon: Dice1 },
  { title: "Taverna", url: "/dashboard/mensagens", icon: MessageCircle },
  { title: "Perfil", url: "/dashboard/perfil", icon: User },
  { title: "Loja de Tokens", url: "/dashboard/tokens", icon: Gem },
  { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const userType = user?.user_metadata?.user_type;
  const collapsed = state === "collapsed";

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-primary";

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
          <img 
            src={logoDragon} 
            alt="Caverna dos Dados" 
            className={`transition-all ${collapsed ? "h-8" : "h-12"}`}
          />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 uppercase text-xs">
            {!collapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {userType === 'master' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/dashboard/pro" className={getNavCls}>
                      <Crown className="h-4 w-4" />
                      {!collapsed && <span>Área PRO</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

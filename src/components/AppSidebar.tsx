import { Home, Dice1, MessageCircle, Gem, Crown, Compass, ScrollText, Shield, Trophy, Calendar, Heart } from "lucide-react";
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
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const collapsed = state === "collapsed";

  const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
    {
      label: "Descoberta",
      items: [
        { title: "Home", url: "/dashboard", icon: Home },
        { title: "Explorar Mesas", url: "/dashboard/explorar", icon: Compass },
        { title: "Favoritas", url: "/dashboard/favoritos", icon: Heart },
      ],
    },
    {
      label: "Meu Jogo",
      items: [
        { title: "Minhas Mesas", url: "/dashboard/mesas", icon: Dice1 },
        { title: "Minhas Aventuras", url: "/dashboard/aventuras", icon: ScrollText },
        { title: "Calendário", url: "/dashboard/calendario", icon: Calendar },
      ],
    },
    {
      label: "Comunidade & Progresso",
      items: [
        { title: "Taverna", url: "/dashboard/mensagens", icon: MessageCircle },
        { title: "Conquistas", url: "/dashboard/conquistas", icon: Trophy },
      ],
    },
    {
      label: "Loja & Extras",
      items: [
        { title: "Loja de Tokens", url: "/dashboard/tokens", icon: Gem },
        { title: "Área PRO", url: "/dashboard/pro", icon: Crown },
      ],
    },
  ];

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

        {groups.map((group, idx) => (
          <SidebarGroup
            key={group.label}
            className={idx > 0 ? "border-t border-sidebar-border/50 mt-1 pt-2" : ""}
          >
            <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] tracking-wider">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === "/dashboard"} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup className="border-t border-sidebar-border/50 mt-1 pt-2">
            <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] tracking-wider">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/dashboard/admin/moderacao" className={getNavCls}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Moderação</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

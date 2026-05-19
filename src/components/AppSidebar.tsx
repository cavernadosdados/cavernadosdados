import { useState } from "react";
import { Home, Dice1, MessageCircle, Gem, Crown, Compass, ScrollText, Shield, Trophy, Calendar, Heart, ChevronDown, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logoGlimer from "@/assets/glimer-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
        { title: "Loja Glimer", url: "/dashboard/loja", icon: Sparkles },
        { title: "Loja de Tokens", url: "/dashboard/tokens", icon: Gem },
        { title: "Área PRO", url: "/dashboard/pro", icon: Crown },
      ],
    },
  ];

  const isRouteInGroup = (items: { url: string }[]) =>
    items.some((item) => location.pathname === item.url);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((group) => {
      initial[group.label] = isRouteInGroup(group.items);
    });
    if (isAdmin) initial["Admin"] = location.pathname === "/dashboard/admin/moderacao";
    return initial;
  });

  const toggleGroup = (label: string) => {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-sidebar-primary"
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-primary";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
          <img
            src={logoGlimer}
            alt="Glimer"
            className={`transition-all object-contain ${collapsed ? "h-8" : "h-10"}`}
          />
        </div>

        {groups.map((group, idx) => (
          <SidebarGroup
            key={group.label}
            className={idx > 0 ? "border-t border-sidebar-border/50 mt-1 pt-2" : ""}
          >
            <Collapsible
              open={collapsed ? false : openGroups[group.label]}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] tracking-wider flex items-center justify-between w-full cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
                  {!collapsed && (
                    <>
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          openGroups[group.label] ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup className="border-t border-sidebar-border/50 mt-1 pt-2">
            <Collapsible
              open={collapsed ? false : openGroups["Admin"]}
              onOpenChange={() => toggleGroup("Admin")}
            >
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] tracking-wider flex items-center justify-between w-full cursor-pointer select-none hover:text-sidebar-foreground transition-colors">
                  {!collapsed && (
                    <>
                      <span>Admin</span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          openGroups["Admin"] ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
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
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

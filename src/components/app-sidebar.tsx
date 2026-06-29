import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, ClipboardList, RotateCw, ChartBar as BarChart3, Star, Bookmark, Bell, User as UserIcon, Shield, GraduationCap } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Mock Tests", url: "/mocks", icon: ClipboardList },
  { title: "Revision", url: "/revision", icon: RotateCw },
  { title: "Progress", url: "/progress", icon: BarChart3 },
];
const tools = [
  { title: "Favorites", url: "/favorites", icon: Star },
  { title: "Bookmarks", url: "/bookmarks", icon: Bookmark },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Profile", url: "/profile", icon: UserIcon },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAdmin } = useAuth();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display font-bold">CGL Hub</div>
              <div className="text-[11px] text-muted-foreground">SSC CGL Prep</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Study</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Admin">
                    <Link to="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </Link>
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

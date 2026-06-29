import { type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/60 backdrop-blur sticky top-0 z-30 flex items-center gap-2 px-3">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon">
              <Link to="/reminders" aria-label="Reminders"><Bell className="h-4 w-4" /></Link>
            </Button>
            <Link to="/profile" className="ml-1">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

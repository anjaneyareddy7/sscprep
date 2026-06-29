import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Pin, Trash2, Users, Shield, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — CGL Hub" }] }),
  beforeLoad: () => {
    // Client-side guard happens in component too.
  },
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) {
    throw redirect({ to: "/dashboard" });
  }
  return (
    <>
      <PageHeader title="Admin" description="Manage users, roles, announcements and content." />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <Tabs defaultValue="announcements">
          <TabsList>
            <TabsTrigger value="announcements"><Megaphone className="h-4 w-4 mr-1" /> Announcements</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
          </TabsList>
          <TabsContent value="announcements" className="mt-4"><AnnouncementsTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function AnnouncementsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["all-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false })).data ?? [],
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [open, setOpen] = useState(false);

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), body: body.trim(), pinned, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posted"); setTitle(""); setBody(""); setPinned(false); setOpen(false); qc.invalidateQueries({ queryKey: ["all-announcements"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: boolean }) => {
      const { error } = await supabase.from("announcements").update({ pinned: pin }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-announcements"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("announcements").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-announcements"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Announcements</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} /></div>
              <div className="flex items-center gap-2"><Switch checked={pinned} onCheckedChange={setPinned} id="pin" /><Label htmlFor="pin">Pin to top</Label></div>
            </div>
            <DialogFooter><Button onClick={() => add.mutate()} disabled={add.isPending}>Post</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {q.data?.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {q.data?.map((a) => (
          <div key={a.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {a.pinned && <Badge variant="secondary">Pinned</Badge>}
                <h4 className="font-medium">{a.title}</h4>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => togglePin.mutate({ id: a.id, pin: !a.pinned })}><Pin className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("*");
      const roleMap: Record<string, string[]> = {};
      roles?.forEach((r) => { (roleMap[r.user_id] ||= []).push(r.role); });
      return (profiles ?? []).map((p) => ({ ...p, roles: roleMap[p.id] ?? [] }));
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["all-users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {q.data?.map((u) => {
          const isAdmin = u.roles.includes("admin");
          return (
            <div key={u.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.full_name || "Unnamed member"}</div>
                <div className="text-xs text-muted-foreground truncate font-mono">{u.id.slice(0, 8)}</div>
              </div>
              <div className="flex items-center gap-3">
                {isAdmin && <Badge className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
                <div className="flex items-center gap-2">
                  <Label htmlFor={`admin-${u.id}`} className="text-xs">Admin</Label>
                  <Switch id={`admin-${u.id}`} checked={isAdmin} onCheckedChange={(v) => toggleAdmin.mutate({ userId: u.id, makeAdmin: v })} />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

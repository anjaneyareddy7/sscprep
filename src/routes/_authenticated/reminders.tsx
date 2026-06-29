import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, isPast } from "date-fns";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders — CGL Hub" }] }),
  component: RemindersPage,
});

function RemindersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["reminders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("reminders").select("*").eq("user_id", user!.id).order("due_at", { ascending: true })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [due, setDue] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("reminders").insert({
        user_id: user!.id, title: title.trim(), note: note.trim() || null, due_at: new Date(due).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Reminder added"); setOpen(false); setTitle(""); setNote(""); qc.invalidateQueries({ queryKey: ["reminders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("reminders").update({ completed: done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("reminders").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Personal nudges for revision, mock attempts, and deadlines."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New reminder</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New reminder</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise Percentages" /></div>
                <div><Label>Notes (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div><Label>Due</Label><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => add.mutate()} disabled={add.isPending}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {q.data?.length === 0 ? <EmptyState icon={<Bell className="h-5 w-5" />} title="No reminders" description="Create your first reminder." /> : (
          <div className="space-y-2">
            {q.data?.map((r) => {
              const overdue = !r.completed && isPast(new Date(r.due_at));
              return (
                <Card key={r.id} className={r.completed ? "opacity-60" : ""}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => toggleDone.mutate({ id: r.id, done: !r.completed })}>
                      <Check className={`h-4 w-4 ${r.completed ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${r.completed ? "line-through" : ""}`}>{r.title}</div>
                      {r.note && <div className="text-xs text-muted-foreground line-clamp-1">{r.note}</div>}
                      <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(r.due_at), "PPp")}</div>
                    </div>
                    {overdue && <Badge variant="destructive">Overdue</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Plus, Trophy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/mocks")({
  head: () => ({ meta: [{ title: "Mocks — CGL Hub" }] }),
  component: MocksPage,
});

function MocksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const platformsQ = useQuery({
    queryKey: ["mock-platforms"],
    queryFn: async () => (await supabase.from("mock_platforms").select("*").order("name")).data ?? [],
  });
  const historyQ = useQuery({
    queryKey: ["mock-history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("mock_history").select("*, platform:mock_platforms(name)").eq("user_id", user!.id).order("attempted_at", { ascending: false })).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [platformId, setPlatformId] = useState<string | undefined>();
  const [testName, setTestName] = useState("");
  const [score, setScore] = useState("");
  const [total, setTotal] = useState("");
  const [attempted, setAttempted] = useState(new Date().toISOString().slice(0, 10));

  const addMock = useMutation({
    mutationFn: async () => {
      if (!score || !total) throw new Error("Enter score and total");
      const { error } = await supabase.from("mock_history").insert({
        user_id: user!.id, platform_id: platformId || null, test_name: testName || null,
        score: parseFloat(score), total: parseFloat(total), attempted_at: new Date(attempted).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mock saved"); setOpen(false); setScore(""); setTotal(""); setTestName("");
      qc.invalidateQueries({ queryKey: ["mock-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const chartData = (historyQ.data ?? []).slice().reverse().map((h) => ({
    date: format(new Date(h.attempted_at), "MMM dd"),
    pct: h.total && h.score != null ? Math.round((h.score / h.total) * 100) : 0,
  }));

  return (
    <>
      <PageHeader
        title="Mock tests"
        description="Log every attempt — patterns in your scores reveal where to focus next."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Log attempt</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log mock attempt</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Platform</Label>
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger><SelectValue placeholder="Choose platform" /></SelectTrigger>
                    <SelectContent>{platformsQ.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Test name (optional)</Label><Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Tier 1 Mock 12" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Score</Label><Input type="number" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} /></div>
                  <div><Label>Total</Label><Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
                </div>
                <div><Label>Attempted on</Label><Input type="date" value={attempted} onChange={(e) => setAttempted(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => addMock.mutate()} disabled={addMock.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Score trend (%)</CardTitle></CardHeader>
            <CardContent className="h-64">
              {chartData.length === 0 ? <EmptyState icon={<Trophy className="h-5 w-5" />} title="No mocks yet" description="Log your first attempt to see the trend." /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Attempts per platform</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregateByPlatform(historyQ.data ?? [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Platforms</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {platformsQ.data?.map((p) => (
              <a key={p.id} href={p.url ?? "#"} target="_blank" rel="noreferrer" className="rounded-lg border p-3 hover:bg-accent/30 transition flex items-center justify-between">
                <div><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div></div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent attempts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(historyQ.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No attempts yet.</p> : historyQ.data?.map((h) => {
              const pct = h.total && h.score != null ? Math.round((h.score / h.total) * 100) : 0;
              return (
                <div key={h.id} className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.test_name || h.platform?.name || "Mock attempt"}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(h.attempted_at), "PP")} · {h.score}/{h.total}</div>
                  </div>
                  <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "outline"}>{pct}%</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function aggregateByPlatform(rows: { platform?: { name: string } | null }[]) {
  const map: Record<string, number> = {};
  rows.forEach((r) => { const k = r.platform?.name || "Other"; map[k] = (map[k] || 0) + 1; });
  return Object.entries(map).map(([name, count]) => ({ name, count }));
}

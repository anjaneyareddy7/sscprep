import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Clock, Flame, RotateCw, Megaphone, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CGL Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Aspirant";

  const stats = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      const [topicsRes, progressRes, completionsRes, revisionsRes, mocksRes, announcementsRes] = await Promise.all([
        supabase.from("topics").select("id", { count: "exact", head: true }),
        supabase.from("progress").select("status").eq("user_id", user!.id),
        supabase.from("completion_history").select("completed_at").eq("user_id", user!.id).order("completed_at", { ascending: false }).limit(5),
        supabase.from("revision_history").select("id, topic_id, revised_at").eq("user_id", user!.id).order("revised_at", { ascending: false }).limit(5),
        supabase.from("mock_history").select("id, score, total, test_name, attempted_at").eq("user_id", user!.id).order("attempted_at", { ascending: false }).limit(3),
        supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
      ]);
      const totalTopics = topicsRes.count ?? 0;
      const completed = progressRes.data?.filter((p) => p.status === "completed").length ?? 0;
      const inProgress = progressRes.data?.filter((p) => p.status === "in_progress").length ?? 0;
      return {
        totalTopics, completed, inProgress,
        completions: completionsRes.data ?? [],
        revisions: revisionsRes.data ?? [],
        mocks: mocksRes.data ?? [],
        announcements: announcementsRes.data ?? [],
      };
    },
    enabled: !!user?.id,
  });

  const data = stats.data;
  const total = data?.totalTopics ?? 0;
  const pct = total > 0 ? Math.round(((data?.completed ?? 0) / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${name}.`}
        description="Pick up where you left off. Small consistent steps beat last-minute marathons."
        actions={<><Button asChild><Link to="/subjects">Start studying <ArrowRight className="h-4 w-4 ml-1" /></Link></Button></>}
      />
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Topics available" value={total} />
          <StatCard icon={Clock} label="In progress" value={data?.inProgress ?? 0} accent="warning" />
          <StatCard icon={CheckCircle2} label="Completed" value={data?.completed ?? 0} accent="success" />
          <StatCard icon={Flame} label="Mock attempts" value={data?.mocks.length ?? 0} accent="primary" />
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Overall topic mastery</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{data?.completed ?? 0} of {total} topics completed</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.announcements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No announcements yet. Admins can post updates from the Admin panel.</p>
              ) : (
                data?.announcements.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Badge variant="secondary">Pinned</Badge>}
                      <h4 className="font-medium">{a.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                    <div className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><RotateCw className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data?.completions ?? []).slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Completed a topic {formatDistanceToNow(new Date(c.completed_at), { addSuffix: true })}
                </div>
              ))}
              {(data?.revisions ?? []).slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-muted-foreground">
                  <RotateCw className="h-4 w-4 text-primary" /> Revised {formatDistanceToNow(new Date(r.revised_at), { addSuffix: true })}
                </div>
              ))}
              {(data?.completions.length ?? 0) + (data?.revisions.length ?? 0) === 0 && (
                <EmptyState title="No activity yet" description="Mark a topic in progress to see your activity here." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, accent = "primary" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: "primary" | "success" | "warning" }) {
  const map = { primary: "bg-primary/10 text-primary", success: "bg-success/15 text-success", warning: "bg-warning/15 text-warning-foreground" };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${map[accent]}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

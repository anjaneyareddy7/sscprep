import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — CGL Hub" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["progress-page", user?.id],
    queryFn: async () => {
      const [{ data: subjects }, { data: sections }, { data: topics }, { data: progress }, { data: completions }] = await Promise.all([
        supabase.from("subjects").select("*").order("order_index"),
        supabase.from("sections").select("id, subject_id"),
        supabase.from("topics").select("id, section_id"),
        supabase.from("progress").select("topic_id, status").eq("user_id", user!.id),
        supabase.from("completion_history").select("completed_at").eq("user_id", user!.id).gte("completed_at", subDays(new Date(), 29).toISOString()),
      ]);
      const sectionToSubject = new Map((sections ?? []).map((s) => [s.id, s.subject_id]));
      const topicToSubject = new Map((topics ?? []).map((t) => [t.id, sectionToSubject.get(t.section_id)!]));
      const completedSet = new Set((progress ?? []).filter((p) => p.status === "completed").map((p) => p.topic_id));
      const bySubject = (subjects ?? []).map((s) => {
        const subjTopics = (topics ?? []).filter((t) => topicToSubject.get(t.id) === s.id);
        return { name: s.name, total: subjTopics.length, completed: subjTopics.filter((t) => completedSet.has(t.id)).length };
      });

      const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
      const dayMap = new Map(days.map((d) => [format(d, "MMM dd"), 0]));
      (completions ?? []).forEach((c) => {
        const k = format(new Date(c.completed_at), "MMM dd");
        if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) || 0) + 1);
      });
      const trend = Array.from(dayMap, ([date, count]) => ({ date, count }));
      return { bySubject, trend };
    },
    enabled: !!user,
  });

  return (
    <>
      <PageHeader title="Progress" description="See where you're winning and where you need to push." />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Topics completed per subject</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={q.data?.bySubject ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Completions over the last 30 days</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={q.data?.trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {q.data?.bySubject.map((s) => {
            const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
            return (
              <Card key={s.name}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-1"><div className="font-medium">{s.name}</div><div className="text-sm text-muted-foreground">{pct}%</div></div>
                <ProgressBar value={pct} />
                <div className="text-xs text-muted-foreground mt-2">{s.completed} of {s.total} topics</div>
              </CardContent></Card>
            );
          })}
        </div>
      </div>
    </>
  );
}

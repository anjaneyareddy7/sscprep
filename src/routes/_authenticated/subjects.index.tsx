import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({ meta: [{ title: "Subjects — CGL Hub" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { user } = useAuth();
  const subjectsQ = useQuery({
    queryKey: ["subjects-with-progress", user?.id],
    queryFn: async () => {
      const { data: subjects } = await supabase.from("subjects").select("*").order("order_index");
      const subjectIds = (subjects ?? []).map((s) => s.id);
      if (subjectIds.length === 0) return [];

      const { data: sections } = await supabase.from("sections").select("id, subject_id").in("subject_id", subjectIds);
      const sectionIds = (sections ?? []).map((s) => s.id);
      const { data: topics } = sectionIds.length
        ? await supabase.from("topics").select("id, section_id").in("section_id", sectionIds)
        : { data: [] as { id: string; section_id: string }[] };
      const { data: progress } = user
        ? await supabase.from("progress").select("topic_id, status").eq("user_id", user.id)
        : { data: [] as { topic_id: string; status: string }[] };

      const sectionToSubject = new Map((sections ?? []).map((s) => [s.id, s.subject_id]));
      const topicToSubject = new Map((topics ?? []).map((t) => [t.id, sectionToSubject.get(t.section_id)!]));
      const counts: Record<string, { total: number; completed: number }> = {};
      subjects?.forEach((s) => (counts[s.id] = { total: 0, completed: 0 }));
      topics?.forEach((t) => { const sid = topicToSubject.get(t.id); if (sid) counts[sid].total++; });
      progress?.forEach((p) => {
        if (p.status !== "completed") return;
        const sid = topicToSubject.get(p.topic_id); if (sid && counts[sid]) counts[sid].completed++;
      });
      return subjects!.map((s) => ({ ...s, ...counts[s.id] }));
    },
  });

  return (
    <>
      <PageHeader title="Subjects" description="Six core subjects for SSC CGL — drill into sections and topic-wise videos." />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {subjectsQ.isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsQ.data?.map((s) => {
              const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[s.icon || "BookOpen"] || Icons.BookOpen;
              const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <Link key={s.id} to="/subjects/$slug" params={{ slug: s.slug }} className="group">
                  <Card className="hover:shadow-md transition border-l-4" style={{ borderLeftColor: `var(--color-chart-${(s.order_index % 5) + 1})` }}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <h3 className="font-display font-semibold group-hover:text-primary transition">{s.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{s.completed} / {s.total} topics</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                        </div>
                        <ProgressBar value={pct} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

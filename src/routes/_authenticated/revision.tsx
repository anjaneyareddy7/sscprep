import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCw } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/revision")({
  head: () => ({ meta: [{ title: "Revision — CGL Hub" }] }),
  component: RevisionPage,
});

function RevisionPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["revisions", user?.id],
    queryFn: async () => {
      const { data: revs } = await supabase.from("revision_history").select("*").eq("user_id", user!.id).order("revised_at", { ascending: false });
      const ids = Array.from(new Set((revs ?? []).map((r) => r.topic_id)));
      const topicsRes = ids.length
        ? await supabase.from("topics").select("id, name, section:sections!inner(name, subject:subjects!inner(name))").in("id", ids)
        : { data: [] as Array<{ id: string; name: string; section: { name: string; subject: { name: string } } }> };
      const topics = topicsRes.data ?? [];
      type TopicRow = { id: string; name: string; section: { name: string; subject: { name: string } } };
      const byTopic: Record<string, { topic: TopicRow | undefined; count: number; last: string }> = {};
      revs?.forEach((r) => {
        if (!byTopic[r.topic_id]) byTopic[r.topic_id] = { topic: topics.find((t) => t.id === r.topic_id) as TopicRow | undefined, count: 0, last: r.revised_at };
        byTopic[r.topic_id].count++;
      });
      return { items: Object.entries(byTopic), recent: revs ?? [] };
    },
    enabled: !!user,
  });
  return (
    <>
      <PageHeader title="Revision history" description="Track your revision cycles per topic — repetition is the secret." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {q.data?.items.length === 0 ? <EmptyState icon={<RotateCw className="h-5 w-5" />} title="No revisions logged" description="Log revisions from any topic page." /> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {q.data?.items.map(([tid, info]) => (
              <Link key={tid} to="/topics/$id" params={{ id: tid }}>
                <Card className="hover:shadow-md transition"><CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{info.topic?.name ?? "Topic"}</div>
                      <div className="text-xs text-muted-foreground">{info.topic?.section.subject.name} · {info.topic?.section.name}</div>
                    </div>
                    <Badge>{info.count} ×</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Last revised {format(new Date(info.last), "PP")}</div>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

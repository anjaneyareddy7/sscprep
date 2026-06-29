import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — CGL Hub" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      const { data: bms } = await supabase.from("bookmarks").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      const topicIds = (bms ?? []).filter((b) => b.entity_type === "topic").map((b) => b.entity_id);
      const { data: topics } = topicIds.length
        ? await supabase.from("topics").select("id, name, section:sections!inner(name, subject:subjects!inner(name, slug))").in("id", topicIds)
        : { data: [] };
      return (bms ?? []).map((b) => ({ ...b, topic: topics?.find((t) => t.id === b.entity_id) }));
    },
    enabled: !!user,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("bookmarks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
  return (
    <>
      <PageHeader title="Bookmarks" description="Quick access to topics you want to come back to." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {q.data?.length === 0 ? <EmptyState icon={<Bookmark className="h-5 w-5" />} title="No bookmarks yet" description="Bookmark topics from the topic page." /> : (
          <div className="space-y-2">
            {q.data?.map((b) => (
              <Card key={b.id}><CardContent className="p-3 flex items-center justify-between">
                {b.topic ? (
                  <Link to="/topics/$id" params={{ id: b.entity_id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.topic.name}</div>
                    <div className="text-xs text-muted-foreground">{b.topic.section.subject.name} · {b.topic.section.name}</div>
                  </Link>
                ) : <div className="text-sm text-muted-foreground">Bookmarked item</div>}
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

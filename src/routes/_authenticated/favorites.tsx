import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favorites — CGL Hub" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data: favs } = await supabase.from("favorites").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      const topicIds = (favs ?? []).filter((f) => f.entity_type === "topic").map((f) => f.entity_id);
      const { data: topics } = topicIds.length
        ? await supabase.from("topics").select("id, name, section:sections!inner(name, subject:subjects!inner(name))").in("id", topicIds)
        : { data: [] };
      return (favs ?? []).map((f) => ({ ...f, topic: topics?.find((t) => t.id === f.entity_id) }));
    },
    enabled: !!user,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("favorites").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
  return (
    <>
      <PageHeader title="Favorites" description="Topics and resources you've starred for repeated practice." />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {q.data?.length === 0 ? <EmptyState icon={<Star className="h-5 w-5" />} title="No favorites yet" description="Star topics from the topic page." /> : (
          <div className="space-y-2">
            {q.data?.map((f) => (
              <Card key={f.id}><CardContent className="p-3 flex items-center justify-between">
                {f.topic ? (
                  <Link to="/topics/$id" params={{ id: f.entity_id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.topic.name}</div>
                    <div className="text-xs text-muted-foreground">{f.topic.section.subject.name} · {f.topic.section.name}</div>
                  </Link>
                ) : <div className="text-sm text-muted-foreground">Favorite item</div>}
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

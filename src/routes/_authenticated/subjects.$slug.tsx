import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { TopicPanel } from "@/components/topic-panel";

export const Route = createFileRoute("/_authenticated/subjects/$slug")({
  head: () => ({ meta: [{ title: "Subject — CGL Hub" }] }),
  component: SubjectPage,
});

function SubjectPage() {
  const { slug } = useParams({ from: "/_authenticated/subjects/$slug" });
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const subjectQ = useQuery({
    queryKey: ["subject", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const treeQ = useQuery({
    queryKey: ["subject-tree", subjectQ.data?.id, user?.id],
    enabled: !!subjectQ.data?.id,
    queryFn: async () => {
      const subjectId = subjectQ.data!.id;
      const { data: sections } = await supabase.from("sections").select("*").eq("subject_id", subjectId).order("order_index");
      const sectionIds = (sections ?? []).map((s) => s.id);
      const { data: topics } = sectionIds.length
        ? await supabase.from("topics").select("*").in("section_id", sectionIds).order("order_index")
        : { data: [] };
      const topicIds = (topics ?? []).map((t) => t.id);
      const { data: progress } = topicIds.length && user
        ? await supabase.from("progress").select("topic_id, status").in("topic_id", topicIds).eq("user_id", user.id)
        : { data: [] };
      const { data: videoCounts } = topicIds.length
        ? await supabase.from("youtube_links").select("topic_id").in("topic_id", topicIds)
        : { data: [] };
      const progressMap = new Map(progress?.map((p) => [p.topic_id, p.status]));
      const videoMap: Record<string, number> = {};
      videoCounts?.forEach((v: { topic_id: string }) => { videoMap[v.topic_id] = (videoMap[v.topic_id] || 0) + 1; });
      return (sections ?? []).map((sec) => ({
        ...sec,
        topics: (topics ?? []).filter((t) => t.section_id === sec.id).map((t) => ({
          ...t, status: progressMap.get(t.id) || "not_started", videoCount: videoMap[t.id] || 0,
        })),
      }));
    },
  });

  const [addSecOpen, setAddSecOpen] = useState(false);
  const [secName, setSecName] = useState("");
  const [secDesc, setSecDesc] = useState("");

  const addSection = useMutation({
    mutationFn: async () => {
      if (!secName.trim()) throw new Error("Name required");
      const { error } = await supabase.from("sections").insert({
        subject_id: subjectQ.data!.id, name: secName.trim(), description: secDesc.trim() || null,
        order_index: (treeQ.data?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Section added"); setSecName(""); setSecDesc(""); setAddSecOpen(false);
      qc.invalidateQueries({ queryKey: ["subject-tree"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [addTopicOpenFor, setAddTopicOpenFor] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicDesc, setTopicDesc] = useState("");

  const addTopic = useMutation({
    mutationFn: async (sectionId: string) => {
      if (!topicName.trim()) throw new Error("Name required");
      const existing = treeQ.data?.find((s) => s.id === sectionId)?.topics.length || 0;
      const { error } = await supabase.from("topics").insert({
        section_id: sectionId, name: topicName.trim(), description: topicDesc.trim() || null, order_index: existing + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Topic added"); setTopicName(""); setTopicDesc(""); setAddTopicOpenFor(null);
      qc.invalidateQueries({ queryKey: ["subject-tree"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["subject-tree"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Topic deleted"); qc.invalidateQueries({ queryKey: ["subject-tree"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const subject = subjectQ.data;
  const sections = treeQ.data ?? [];

  return (
    <>
      <PageHeader
        title={subject?.name ?? "Loading…"}
        description={subject?.description ?? ""}
        actions={isAdmin ? (
          <Dialog open={addSecOpen} onOpenChange={setAddSecOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add section</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New section</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="e.g. Arithmetic" /></div>
                <div><Label>Description (optional)</Label><Textarea value={secDesc} onChange={(e) => setSecDesc(e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => addSection.mutate()} disabled={addSection.isPending}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {sections.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-5 w-5" />}
            title="No sections yet"
            description={isAdmin ? "Add the first section to start organizing this subject." : "An admin needs to add sections to this subject."}
          />
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {sections.map((sec) => {
              const completed = sec.topics.filter((t) => t.status === "completed").length;
              return (
                <AccordionItem key={sec.id} value={sec.id} className="rounded-lg border bg-card px-4">
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="flex-1">
                      <div className="flex items-center gap-3 text-left">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{sec.name}</div>
                          <div className="text-xs text-muted-foreground">{sec.topics.length} topics · {completed} completed</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteSection.mutate(sec.id)} aria-label="Delete section"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2 pb-2">
                      {sec.topics.length === 0 && <p className="text-sm text-muted-foreground px-2">No topics yet.</p>}
                      {sec.topics.map((t) => (
                        <Link key={t.id} to="/topics/$id" params={{ id: t.id }} className="block">
                          <Card className="hover:bg-accent/30 transition">
                            <CardContent className="p-3 flex items-center gap-3">
                              <StatusDot status={t.status} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{t.name}</div>
                                <div className="text-xs text-muted-foreground">{t.videoCount} video{t.videoCount === 1 ? "" : "s"}</div>
                              </div>
                              <Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); deleteTopic.mutate(t.id); }} aria-label="Delete topic"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                      {isAdmin && (
                        <Dialog open={addTopicOpenFor === sec.id} onOpenChange={(o) => setAddTopicOpenFor(o ? sec.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-2"><Plus className="h-4 w-4 mr-1" /> Add topic</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>New topic in {sec.name}</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>Name</Label><Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g. Percentages" /></div>
                              <div><Label>Description (optional)</Label><Textarea value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} /></div>
                            </div>
                            <DialogFooter><Button onClick={() => addTopic.mutate(sec.id)} disabled={addTopic.isPending}>Create</Button></DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </>
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "completed" ? "bg-success" : status === "in_progress" ? "bg-warning" : "bg-muted-foreground/30";
  return <span className={`h-2.5 w-2.5 rounded-full ${c}`} aria-hidden />;
}

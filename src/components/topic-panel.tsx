import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Youtube, Plus, Trash2, ExternalLink, RotateCw, Bookmark, Star, NotebookPen, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { extractYouTubeId, fetchYouTubeMeta, youtubeThumb, youtubeWatchUrl } from "@/lib/youtube";

export function TopicPanel({ topicId }: { topicId: string }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const id = topicId;

  const videosQ = useQuery({
    queryKey: ["topic-videos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("youtube_links").select("*").eq("topic_id", id).order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const progressQ = useQuery({
    queryKey: ["topic-progress", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("progress").select("*").eq("topic_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const remarkQ = useQuery({
    queryKey: ["topic-remark", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("remarks").select("*").eq("topic_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const bookmarkQ = useQuery({
    queryKey: ["topic-bookmark", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("id").eq("entity_type", "topic").eq("entity_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const favQ = useQuery({
    queryKey: ["topic-fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("entity_type", "topic").eq("entity_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const revisionsQ = useQuery({
    queryKey: ["topic-revisions", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("revision_history").select("*").eq("topic_id", id).eq("user_id", user!.id).order("revised_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: "not_started" | "in_progress" | "completed") => {
      const now = new Date().toISOString();
      const payload: { user_id: string; topic_id: string; status: "not_started" | "in_progress" | "completed"; updated_at: string; started_at?: string; completed_at?: string } = { user_id: user!.id, topic_id: id, status, updated_at: now };
      if (status === "in_progress" && !progressQ.data?.started_at) payload.started_at = now;
      if (status === "completed") payload.completed_at = now;
      const { error } = await supabase.from("progress").upsert(payload, { onConflict: "user_id,topic_id" });
      if (error) throw error;
      if (status === "completed") {
        await supabase.from("completion_history").insert({ user_id: user!.id, topic_id: id });
      }
      await supabase.from("activities").insert({ user_id: user!.id, action: `progress_${status}`, entity_type: "topic", entity_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topic-progress"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["subject-tree"] });
      toast.success("Progress updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRevision = useMutation({
    mutationFn: async (notes: string) => {
      const cycle = (revisionsQ.data?.length ?? 0) + 1;
      const { error } = await supabase.from("revision_history").insert({
        user_id: user!.id, topic_id: id, cycle_number: cycle, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Revision logged"); qc.invalidateQueries({ queryKey: ["topic-revisions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (bookmarkQ.data) {
        const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookmarks").insert({ user_id: user!.id, entity_type: "topic", entity_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic-bookmark"] }),
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (favQ.data) {
        const { error } = await supabase.from("favorites").delete().eq("id", favQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user!.id, entity_type: "topic", entity_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic-fav"] }),
  });

  const [remark, setRemark] = useState("");
  const saveRemark = useMutation({
    mutationFn: async () => {
      const value = (remark || remarkQ.data?.content || "").trim();
      if (!value) return;
      const { error } = await supabase.from("remarks").upsert({
        user_id: user!.id, topic_id: id, content: value,
      }, { onConflict: "user_id,topic_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Remark saved"); qc.invalidateQueries({ queryKey: ["topic-remark"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [vidUrl, setVidUrl] = useState("");
  const [vidTitle, setVidTitle] = useState("");
  const [vidChannel, setVidChannel] = useState("");
  const [vidDuration, setVidDuration] = useState("");
  const [vidThumb, setVidThumb] = useState("");
  const [vidOpen, setVidOpen] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);

  const onUrlBlur = async () => {
    if (!vidUrl) return;
    setFetchingMeta(true);
    const meta = await fetchYouTubeMeta(vidUrl);
    if (meta.title && !vidTitle) setVidTitle(meta.title);
    if (meta.channel && !vidChannel) setVidChannel(meta.channel);
    if (meta.thumbnail) setVidThumb(meta.thumbnail);
    setFetchingMeta(false);
  };

  const addVideo = useMutation({
    mutationFn: async () => {
      const videoId = extractYouTubeId(vidUrl);
      if (!videoId) throw new Error("Enter a valid YouTube URL");
      const { error } = await supabase.from("youtube_links").insert({
        topic_id: id, url: vidUrl, video_id: videoId, title: vidTitle || null,
        channel: vidChannel || null, duration: vidDuration || null,
        thumbnail_url: vidThumb || youtubeThumb(videoId, "hq"),
        added_by: user!.id, order_index: (videosQ.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Video added");
      setVidUrl(""); setVidTitle(""); setVidChannel(""); setVidDuration(""); setVidThumb(""); setVidOpen(false);
      qc.invalidateQueries({ queryKey: ["topic-videos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeVideo = useMutation({
    mutationFn: async (vid: string) => {
      const { error } = await supabase.from("youtube_links").delete().eq("id", vid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Video removed"); qc.invalidateQueries({ queryKey: ["topic-videos"] }); },
  });

  const status = progressQ.data?.status ?? "not_started";

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap gap-2 items-center justify-end">
        <Button variant="ghost" size="icon" onClick={() => toggleBookmark.mutate()} aria-label="Bookmark">
          <Bookmark className={`h-4 w-4 ${bookmarkQ.data ? "fill-primary text-primary" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate()} aria-label="Favorite">
          <Star className={`h-4 w-4 ${favQ.data ? "fill-accent text-accent" : ""}`} />
        </Button>
        <Select value={status} onValueChange={(v) => setStatus.mutate(v as "not_started" | "in_progress" | "completed")}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-sm font-semibold flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500" /> Video lectures</h4>
          {isAdmin && (
            <Dialog open={vidOpen} onOpenChange={setVidOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add video</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add YouTube video</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>YouTube URL</Label>
                    <div className="relative">
                      <Input value={vidUrl} onChange={(e) => setVidUrl(e.target.value)} onBlur={onUrlBlur} placeholder="https://www.youtube.com/watch?v=…" />
                      {fetchingMeta && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div><Label>Title</Label><Input value={vidTitle} onChange={(e) => setVidTitle(e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Channel</Label><Input value={vidChannel} onChange={(e) => setVidChannel(e.target.value)} /></div>
                    <div><Label>Duration</Label><Input value={vidDuration} onChange={(e) => setVidDuration(e.target.value)} placeholder="e.g. 28:14" /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => addVideo.mutate()} disabled={addVideo.isPending}>Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {(videosQ.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No videos yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {videosQ.data?.map((v) => (
              <a key={v.id} href={youtubeWatchUrl(v.video_id || "")} target="_blank" rel="noreferrer" className="group">
                <Card className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    <img src={v.thumbnail_url || (v.video_id ? youtubeThumb(v.video_id, "hq") : "")} alt={v.title || "Video"} className="h-full w-full object-cover group-hover:scale-105 transition" />
                    {v.duration && <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0">{v.duration}</Badge>}
                    <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/30">
                      <ExternalLink className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium line-clamp-2 text-sm">{v.title || "Untitled video"}</h3>
                        {v.channel && <p className="text-xs text-muted-foreground mt-0.5">{v.channel}</p>}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); removeVideo.mutate(v.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2"><RotateCw className="h-4 w-4 text-primary" /> Revision</h4>
            <p className="text-xs text-muted-foreground">Cycle #{(revisionsQ.data?.length ?? 0) + 1} next.</p>
            <RevisionForm onSubmit={(notes) => addRevision.mutate(notes)} pending={addRevision.isPending} />
            <div className="space-y-1 max-h-40 overflow-auto">
              {revisionsQ.data?.map((r) => (
                <div key={r.id} className="text-xs flex items-center justify-between border rounded p-2">
                  <span>Cycle {r.cycle_number}</span>
                  <span className="text-muted-foreground">{new Date(r.revised_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" /> Your remark</h4>
            <Textarea
              value={remark || remarkQ.data?.content || ""}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Personal notes, tricks, doubts to revisit…"
              rows={5}
            />
            <Button onClick={() => saveRemark.mutate()} disabled={saveRemark.isPending} size="sm">Save remark</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RevisionForm({ onSubmit, pending }: { onSubmit: (notes: string) => void; pending: boolean }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-2">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quick notes (optional)" rows={2} />
      <Button size="sm" onClick={() => { onSubmit(notes); setNotes(""); }} disabled={pending}>Log revision</Button>
    </div>
  );
}

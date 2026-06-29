import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, BarChart3, RotateCw, ClipboardList, Library, ArrowRight, CheckCircle2, Users, Youtube } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSC CGL Preparation Hub — A focused study workspace" },
      { name: "description", content: "Organize subjects, save topic-wise YouTube videos, track progress, schedule revision and analyze mock tests — purpose-built for serious SSC CGL aspirants." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display font-bold">CGL Hub</span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
          Built for a small, focused study group
        </div>
        <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight">
          Your SSC CGL prep,
          <span className="block text-primary">finally organized.</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-5 max-w-2xl mx-auto">
          One workspace for every subject, every topic, every YouTube playlist, every PDF, every mock — with progress tracking and revision cycles that keep you honest.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Button asChild size="lg"><Link to="/auth">Start preparing <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { i: BookOpen, t: "Subject → Section → Topic", d: "All six SSC CGL subjects pre-loaded. Drill down to a topic in two clicks." },
          { i: Youtube, t: "Topic-wise video library", d: "Save multiple YouTube lectures per topic with auto thumbnail and title. Open in YouTube." },
          { i: Library, t: "Resources in one place", d: "Notes, DPPs, formula sheets, PYQs, books — Telegram, Drive or PDF, neatly tagged." },
          { i: BarChart3, t: "Progress that motivates", d: "Mark topics in-progress or completed. Watch your subject mastery climb." },
          { i: RotateCw, t: "Revision cycles", d: "Schedule revisions, log every cycle, keep notes — never forget what you learned." },
          { i: ClipboardList, t: "Mock test hub", d: "Quick links to Mockers, Testbook, Oliveboard, Adda247, PracticeMock + your score history." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-5 hover:shadow-md transition">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
              <f.i className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="bg-card border-y">
        <div className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { i: Users, n: "5–10", l: "Aspirants per group" },
            { i: CheckCircle2, n: "100%", l: "RLS-secured data" },
            { i: GraduationCap, n: "6", l: "Subjects ready to study" },
          ].map((s) => (
            <div key={s.l}>
              <s.i className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-display font-bold">{s.n}</div>
              <div className="text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
        Built for serious SSC CGL aspirants. Expandable to any competitive exam.
      </footer>
    </div>
  );
}

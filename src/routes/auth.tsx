import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SSC CGL Hub" }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Enter your name").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error(res.error.message || "Google sign-in failed");
    if (!res.redirected && !res.error) navigate({ to: "/dashboard" });
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const eRes = emailSchema.safeParse(email);
    const pRes = passwordSchema.safeParse(password);
    if (!eRes.success) return toast.error(eRes.error.issues[0].message);
    if (!pRes.success) return toast.error(pRes.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: eRes.data, password: pRes.data });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const nRes = nameSchema.safeParse(name);
    const eRes = emailSchema.safeParse(email);
    const pRes = passwordSchema.safeParse(password);
    if (!nRes.success) return toast.error(nRes.error.issues[0].message);
    if (!eRes.success) return toast.error(eRes.error.issues[0].message);
    if (!pRes.success) return toast.error(pRes.error.issues[0].message);
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: eRes.data, password: pRes.data,
      options: { data: { full_name: nRes.data } },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    if (signUpData.session) {
      toast.success("Account created. Welcome!");
      navigate({ to: "/dashboard" });
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: eRes.data, password: pRes.data });
    setLoading(false);
    if (signInError) {
      toast.success("Account created. Please sign in.");
      setTab("signin");
      return;
    }
    toast.success("Account created. Welcome!");
    navigate({ to: "/dashboard" });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const eRes = emailSchema.safeParse(email);
    if (!eRes.success) return toast.error(eRes.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(eRes.data, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If that email exists, a reset link is on its way.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-white/15 grid place-items-center"><GraduationCap className="h-5 w-5" /></div>
          <span className="font-display font-bold text-lg">CGL Hub</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">Study with intent.<br />Revise with discipline.</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-md">A single source of truth for your SSC CGL preparation — subjects, videos, notes, mocks, and progress, all in one calm workspace.</p>
        </div>
        <div className="text-sm text-primary-foreground/70">© CGL Hub · Built for serious aspirants</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl">{tab === "signup" ? "Create your account" : tab === "forgot" ? "Reset your password" : "Welcome back"}</CardTitle>
            <CardDescription>{tab === "signup" ? "Start your SSC CGL prep in a focused workspace." : tab === "forgot" ? "We'll email you a secure reset link." : "Sign in to continue your preparation."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="forgot">Forgot</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-4">
                <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </Button>
                <Separator />
                <form onSubmit={handleSignIn} className="space-y-3">
                  <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />} type="email" autoComplete="email" value={email} onChange={setEmail} />
                  <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />} type="password" autoComplete="current-password" value={password} onChange={setPassword} />
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </Button>
                <Separator />
                <form onSubmit={handleSignUp} className="space-y-3">
                  <Field id="name" label="Full name" icon={<UserIcon className="h-4 w-4" />} value={name} onChange={setName} autoComplete="name" />
                  <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />} type="email" autoComplete="email" value={email} onChange={setEmail} />
                  <Field id="password" label="Password" icon={<Lock className="h-4 w-4" />} type="password" autoComplete="new-password" value={password} onChange={setPassword} />
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
                </form>
              </TabsContent>

              <TabsContent value="forgot" className="space-y-4 mt-4">
                <form onSubmit={handleForgot} className="space-y-3">
                  <Field id="email" label="Email" icon={<Mail className="h-4 w-4" />} type="email" autoComplete="email" value={email} onChange={setEmail} />
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="relative my-1"><div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or with email</span></div></div>;
}

function Field({ id, label, icon, value, onChange, ...rest }: { id: string; label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" {...rest} />
      </div>
    </div>
  );
}

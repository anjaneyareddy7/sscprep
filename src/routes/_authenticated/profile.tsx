import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CGL Hub" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAdmin, signOut } = useAuth();
  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const [fullName, setFullName] = useState("");
  const [targetExam, setTargetExam] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setFullName(profileQ.data.full_name ?? "");
      setTargetExam(profileQ.data.target_exam ?? "SSC CGL");
    }
  }, [profileQ.data]);

  const save = async () => {
    const { error } = await supabase.from("profiles").update({ full_name: fullName, target_exam: targetExam }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const avatarUrl = profileQ.data?.avatar_url || user?.user_metadata?.avatar_url;
  const initials = (profileQ.data?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader title="Profile" description="Manage your account and preferences." />
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Your details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarImage src={avatarUrl} /><AvatarFallback>{initials}</AvatarFallback></Avatar>
              <div className="text-sm">
                <div className="font-medium">{user?.email}</div>
                <div className="text-muted-foreground">{isAdmin ? "Administrator" : "Member"}</div>
              </div>
            </div>
            <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>Target exam</Label><Input value={targetExam} onChange={(e) => setTargetExam(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button onClick={save}>Save changes</Button>
              <Button variant="outline" onClick={signOut}>Sign out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

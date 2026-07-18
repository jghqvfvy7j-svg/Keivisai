import { notFound } from "next/navigation";
import { ShieldAlert, Activity, Users, Dumbbell, Apple, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";
// Never cached, never indexed, never previewed by a crawler or link unfurler.
export const metadata = {
  title: "Control",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const ctx = await getAdminContext();
  // Not an admin (or not signed in, or the network failed): behave exactly as if
  // this route did not exist. A 404 leaks nothing, not even that a panel is here.
  if (!ctx) notFound();
  const { supabase } = ctx;

  // Richer overview: users, activity, content counts, security events.
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgoDate = new Date(now);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgo = weekAgoDate.toISOString();
  const [
    { data: events },
    { count: userCount },
    { data: usage },
    { count: sessionCount },
    { count: sessionsWeek },
    { count: mealCount },
    { count: convCount },
  ] = await Promise.all([
    supabase.from("ai_security_events").select("reason,snippet,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("users_profiles").select("user_id", { count: "exact", head: true }),
    supabase.from("ai_usage").select("kind,count").eq("day", today),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).gte("started_at", weekAgo),
    supabase.from("nutrition_logs").select("id", { count: "exact", head: true }),
    supabase.from("coach_conversations").select("id", { count: "exact", head: true }),
  ]);

  const totalToday = (usage ?? []).reduce((s, u) => s + Number(u.count ?? 0), 0);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="pt-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <ShieldAlert className="h-6 w-6 text-volt" /> Admin
        </h1>
        <p className="mt-1 text-sm text-muted">Live overview and security events.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <Users className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{userCount ?? 0}</p>
          <p className="text-xs text-muted">Total users</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Activity className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{totalToday}</p>
          <p className="text-xs text-muted">AI calls today</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Dumbbell className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{sessionCount ?? 0}</p>
          <p className="text-xs text-muted">Workouts logged ({sessionsWeek ?? 0} this week)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Apple className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{mealCount ?? 0}</p>
          <p className="text-xs text-muted">Meals logged</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <MessageSquare className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{convCount ?? 0}</p>
          <p className="text-xs text-muted">Coach conversations</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <ShieldAlert className="h-4 w-4 text-muted" />
          <p className="font-score mt-2 text-2xl font-bold">{events?.length ?? 0}</p>
          <p className="text-xs text-muted">Security events</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="font-display text-sm font-bold">Recent security events</p>
          {(!events || events.length === 0) ? (
            <p className="mt-3 text-sm text-muted">No security events logged.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {events.map((e, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-coral">{e.reason}</span>
                    <span className="text-[11px] text-muted-2">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  {e.snippet && <p className="mt-1 line-clamp-2 text-xs text-muted">{e.snippet}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

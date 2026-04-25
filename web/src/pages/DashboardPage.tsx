import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Counts = {
  total: number;
  checkedIn: number;
  issued: number;
};

export function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({ total: 0, checkedIn: 0, issued: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [totalRes, checkedRes, issuedRes] = await Promise.all([
        supabase.from("tickets").select("id", { head: true, count: "exact" }),
        supabase.from("tickets").select("id", { head: true, count: "exact" }).eq("status", "checked_in"),
        supabase.from("tickets").select("id", { head: true, count: "exact" }).eq("status", "issued"),
      ]);

      setCounts({
        total: totalRes.count ?? 0,
        checkedIn: checkedRes.count ?? 0,
        issued: issuedRes.count ?? 0,
      });
      setLoading(false);
    };

    void load();
  }, []);

  const remaining = Math.max(counts.total - counts.checkedIn, 0);

  return (
    <section className="space-y-3">
      <h2 className="font-['Sora'] text-xl text-ink">Dashboard</h2>
      {loading ? <p className="text-sm text-ink/70">Loading counts...</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Total" value={counts.total} tone="bg-white" />
        <Card title="Checked In" value={counts.checkedIn} tone="bg-pine text-white" />
        <Card title="Remaining" value={remaining} tone="bg-ember text-white" />
      </div>
    </section>
  );
}

function Card({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <article className={`rounded-xxl p-4 shadow-panel ${tone}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </article>
  );
}

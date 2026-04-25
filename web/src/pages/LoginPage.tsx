import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto mt-20 max-w-md rounded-xxl bg-white p-6 shadow-panel">
      <h2 className="font-['Sora'] text-2xl text-ink">Organizer Login</h2>
      <p className="mt-1 text-sm text-ink/70">Use your Supabase Auth account.</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <button
          disabled={loading}
          className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm font-medium text-ember">{error}</p> : null}
    </div>
  );
}

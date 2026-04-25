import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Protected } from "./components/Protected";
import { supabase } from "./lib/supabase";
import { AddTicketPage } from "./pages/AddTicketPage";
import { CheckTicketPage } from "./pages/CheckTicketPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { TicketDetailsPage } from "./pages/TicketDetailsPage";
import { TicketSearchPage } from "./pages/TicketSearchPage";

export function App() {
  const [session, setSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => setSession(Boolean(sess)));

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected session={session}>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/add" element={<AddTicketPage />} />
                <Route path="/search" element={<TicketSearchPage />} />
                <Route path="/tickets/:id" element={<TicketDetailsPage />} />
                <Route path="/check" element={<CheckTicketPage />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  );
}

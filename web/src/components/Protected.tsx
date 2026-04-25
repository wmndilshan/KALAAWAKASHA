import { Navigate } from "react-router-dom";

type ProtectedProps = {
  session: boolean;
  children: React.ReactNode;
};

export function Protected({ session, children }: ProtectedProps) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

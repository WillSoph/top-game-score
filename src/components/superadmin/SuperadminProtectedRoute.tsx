import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  superadminAuth,
  checkSuperadminAccess,
} from "../../lib/superadminAuth";

type Props = {
  children: React.ReactNode;
};

export default function SuperadminProtectedRoute({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authorized" | "denied">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(superadminAuth, async (user) => {
      if (!user) {
        if (active) setStatus("denied");
        return;
      }

      try {
        const authorized = await checkSuperadminAccess();

        if (active) {
          setStatus(authorized ? "authorized" : "denied");
        }
      } catch {
        if (active) setStatus("denied");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050B1C] text-emerald-400">
        Verificando acesso administrativo...
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/superadmin" replace />;
  }

  return <>{children}</>;
}

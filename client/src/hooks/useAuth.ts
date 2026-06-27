import { useEffect, useState } from "react";
import { trpc } from "@/utils/trpc";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // Try to get user from session - if it fails, user is not authenticated
        const response = await fetch("/api/trpc/user.me?input={}", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.result?.data) {
            setUser(data.result.data);
          }
        }
      } catch (err) {
        // User not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/oauth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      setError("Erro ao fazer logout");
    }
  };

  return { user, loading, error, logout, isAuthenticated: !!user };
}

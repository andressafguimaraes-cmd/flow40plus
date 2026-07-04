import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: user => utils.auth.me.setData(undefined, user),
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: user => utils.auth.me.setData(undefined, user),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.setData(undefined, null),
  });

  const extractErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof TRPCClientError) return error.message;
    return fallback;
  };

  const signup = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      try {
        await signupMutation.mutateAsync(input);
        return { success: true as const };
      } catch (error) {
        return { success: false as const, error: extractErrorMessage(error, "Erro ao criar conta. Tente novamente.") };
      }
    },
    [signupMutation]
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      try {
        await loginMutation.mutateAsync(input);
        return { success: true as const };
      } catch (error) {
        return { success: false as const, error: extractErrorMessage(error, "Erro ao entrar. Tente novamente.") };
      }
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading:
        meQuery.isLoading ||
        signupMutation.isPending ||
        loginMutation.isPending ||
        logoutMutation.isPending,
      error: meQuery.error ?? signupMutation.error ?? loginMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      signupMutation.isPending,
      signupMutation.error,
      loginMutation.isPending,
      loginMutation.error,
      logoutMutation.isPending,
    ]
  );

  return {
    ...state,
    signup,
    login,
    logout,
  };
}

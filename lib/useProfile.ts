"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";

/**
 * Perfil de quem está logado.
 *   undefined = ainda carregando · null = logado sem perfil (ou deslogado)
 */
export function useMyProfile(): Profile | null | undefined {
  const { token, ready } = useAuthEmail();
  const profile = useQuery(api.profiles.me, token ? { token } : "skip") as Profile | null | undefined;
  if (!ready) return undefined;
  if (!token) return null;
  return profile;
}

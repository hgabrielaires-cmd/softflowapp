// ─── Types for Usuarios module ──────────────────────────────────────────

import type { Profile, AppRole } from "@/lib/supabase-types";

export interface UserWithRoles extends Profile {
  roles: AppRole[];
  filial_nome?: string;
  acesso_global: boolean;
  filiais_vinculadas?: { id: string; nome: string }[];
  mesas_vinculadas?: { id: string; nome: string }[];
}

export interface MesaOption {
  id: string;
  nome: string;
}

export interface SetorOption {
  id: string;
  nome: string;
}

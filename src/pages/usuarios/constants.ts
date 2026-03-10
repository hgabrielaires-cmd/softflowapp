// ─── Constants for Usuarios module ──────────────────────────────────────

import type { AppRole } from "@/lib/supabase-types";

export const ITEMS_PER_PAGE = 15;

export const ALL_ROLES: AppRole[] = ["admin", "gestor", "financeiro", "vendedor", "operacional", "tecnico"];

export const TIPO_TECNICO_OPTIONS = [
  { value: "interno", label: "Interno" },
  { value: "externo", label: "Externo" },
  { value: "ambos", label: "Ambos" },
] as const;

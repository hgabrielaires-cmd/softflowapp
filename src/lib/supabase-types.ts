export type AppRole = 'admin' | 'financeiro' | 'vendedor' | 'operacional';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  operacional: 'Operacional',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  financeiro: 'bg-blue-100 text-blue-700 border-blue-200',
  vendedor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  operacional: 'bg-orange-100 text-orange-700 border-orange-200',
};

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  filial: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

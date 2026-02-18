export type AppRole = 'admin' | 'financeiro' | 'vendedor' | 'tecnico';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  financeiro: 'Financeiro',
  vendedor: 'Vendedor',
  tecnico: 'Técnico',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  financeiro: 'bg-blue-100 text-blue-700 border-blue-200',
  vendedor: 'bg-sky-100 text-sky-700 border-sky-200',
  tecnico: 'bg-orange-100 text-orange-700 border-orange-200',
};

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  filial: string | null;
  filial_id: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Filial {
  id: string;
  nome: string;
  ativa: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

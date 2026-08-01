export type Role = "owner" | "admin" | "manager" | "seller" | "operator";

export type Permission =
  | "pdv" | "vendas" | "vendas:cancelar" | "clientes" | "caixa"
  | "produtos:ver" | "produtos:editar" | "estoque" | "compras" | "fornecedores"
  | "contas" | "despesas" | "relatorios" | "equipe" | "configuracoes";

const GESTAO: Role[] = ["owner", "admin", "manager"];
const BALCAO: Role[] = ["owner", "admin", "manager", "seller"];
const ESTOQUE: Role[] = ["owner", "admin", "manager", "operator"];
const TODOS: Role[] = ["owner", "admin", "manager", "seller", "operator"];

const MATRIX: Record<Permission, Role[]> = {
  "pdv": BALCAO,
  "vendas": BALCAO,
  "vendas:cancelar": GESTAO,
  "clientes": BALCAO,
  "caixa": BALCAO,
  "produtos:ver": TODOS,
  "produtos:editar": ESTOQUE,
  "estoque": ESTOQUE,
  "compras": ESTOQUE,
  "fornecedores": ESTOQUE,
  "contas": GESTAO,
  "despesas": GESTAO,
  "relatorios": GESTAO,
  "equipe": GESTAO,
  "configuracoes": ["owner", "admin"],
};

export function can(role: string, perm: Permission): boolean {
  return (MATRIX[perm] ?? []).includes(role as Role);
}

/** Permissão exigida por rota do menu (null = liberada para todos os membros). */
export const ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  "/app": null,
  "/app/mais": null,
  "/app/pdv": "pdv",
  "/app/produtos": "produtos:ver",
  "/app/estoque": "estoque",
  "/app/vendas": "vendas",
  "/app/clientes": "clientes",
  "/app/fornecedores": "fornecedores",
  "/app/compras": "compras",
  "/app/caixa": "caixa",
  "/app/contas": "contas",
  "/app/despesas": "despesas",
  "/app/relatorios": "relatorios",
  "/app/equipe": "equipe",
  "/app/configuracoes": "configuracoes",
};

export function canAccessRoute(role: string, href: string): boolean {
  const perm = ROUTE_PERMISSIONS[href];
  return perm === null || perm === undefined ? true : can(role, perm);
}

export const ROLE_LABELS: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  manager: "Gerente",
  seller: "Vendedor / Caixa",
  operator: "Estoquista / Operador",
};

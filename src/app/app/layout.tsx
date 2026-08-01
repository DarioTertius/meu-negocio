import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { canAccessRoute } from "@/lib/permissions";
import { signOut } from "@/app/(auth)/actions";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Receipt, Users, LogOut,
  Truck, ShoppingBag, Wallet, ReceiptText, TrendingDown, BarChart3, Settings, Menu, UserPlus,
} from "lucide-react";

const sidebarNav = [
  { href: "/app", label: "Início", icon: LayoutDashboard },
  { href: "/app/pdv", label: "PDV", icon: ShoppingCart },
  { href: "/app/produtos", label: "Produtos", icon: Package },
  { href: "/app/estoque", label: "Estoque", icon: Boxes },
  { href: "/app/vendas", label: "Vendas", icon: Receipt },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/app/compras", label: "Compras", icon: ShoppingBag },
  { href: "/app/caixa", label: "Caixa", icon: Wallet },
  { href: "/app/contas", label: "Contas", icon: ReceiptText },
  { href: "/app/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/app/equipe", label: "Equipe", icon: UserPlus },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
];

const bottomNav = [
  { href: "/app", label: "Início", icon: LayoutDashboard },
  { href: "/app/pdv", label: "PDV", icon: ShoppingCart },
  { href: "/app/produtos", label: "Produtos", icon: Package },
  { href: "/app/vendas", label: "Vendas", icon: Receipt },
  { href: "/app/mais", label: "Mais", icon: Menu },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org, role } = await requireOrg();
  const nav = sidebarNav.filter((i) => canAccessRoute(role, i.href));
  const bottom = bottomNav.filter((i) => canAccessRoute(role, i.href));

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-sm font-bold text-brand-800">Meu Negócio</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{org?.name}</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="border-t border-slate-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
      </aside>

      {/* Topo (mobile) */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div>
            <p className="text-sm font-bold text-brand-800">Meu Negócio</p>
            <p className="truncate text-xs text-slate-500">{org?.name}</p>
          </div>
          <form action={signOut}>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white md:hidden">
          {bottom.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-slate-500 hover:text-brand-700"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { canAccessRoute } from "@/lib/permissions";
import { Card } from "@/components/ui";
import {
  Boxes, Truck, ShoppingBag, Wallet, ReceiptText, TrendingDown, BarChart3, Settings, Users, UserPlus, ClipboardList, Package,
} from "lucide-react";

const links = [
  { href: "/app/comandas", label: "Comandas", desc: "Mesas e contas abertas", icon: ClipboardList },
  { href: "/app/produtos", label: "Produtos", desc: "Catálogo, preços e importação", icon: Package },
  { href: "/app/estoque", label: "Estoque", desc: "Entradas, saídas e histórico", icon: Boxes },
  { href: "/app/clientes", label: "Clientes", desc: "Cadastro e histórico de compras", icon: Users },
  { href: "/app/fornecedores", label: "Fornecedores", desc: "Quem abastece seu negócio", icon: Truck },
  { href: "/app/compras", label: "Compras", desc: "Entrada de mercadoria com custo", icon: ShoppingBag },
  { href: "/app/caixa", label: "Caixa", desc: "Abertura, sangria e fechamento", icon: Wallet },
  { href: "/app/contas", label: "Contas", desc: "A pagar e a receber", icon: ReceiptText },
  { href: "/app/despesas", label: "Despesas", desc: "Gastos do dia a dia", icon: TrendingDown },
  { href: "/app/relatorios", label: "Relatórios", desc: "Vendas, produtos e resultado", icon: BarChart3 },
  { href: "/app/equipe", label: "Equipe", desc: "Convide gerente, caixa, estoquista", icon: UserPlus },
  { href: "/app/configuracoes", label: "Configurações", desc: "Empresa e plano", icon: Settings },
];

export const dynamic = "force-dynamic";

export default async function MaisPage() {
  const { role } = await requireOrg();
  const visible = links.filter((l) => canAccessRoute(role, l.href));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Mais</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-4 transition hover:border-brand-400">
              <l.icon className="h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-medium">{l.label}</p>
                <p className="text-xs text-slate-500">{l.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

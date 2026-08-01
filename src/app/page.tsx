import Link from "next/link";
import { Store, Package, ShoppingCart, Wallet, Users, BarChart3 } from "lucide-react";

const features = [
  { icon: Package, title: "Estoque sob controle", desc: "Entradas, saídas, estoque mínimo e alertas de reposição." },
  { icon: ShoppingCart, title: "PDV rápido", desc: "Venda em segundos no celular, tablet ou computador." },
  { icon: Users, title: "Clientes organizados", desc: "Cadastro, histórico de compras e contato pelo WhatsApp." },
  { icon: Wallet, title: "Caixa e financeiro", desc: "Saiba quanto entrou, quanto saiu e quanto sobrou." },
  { icon: BarChart3, title: "Relatórios claros", desc: "Vendas por período, produtos mais vendidos e resultado." },
  { icon: Store, title: "Feito para o seu negócio", desc: "Loja, salão, oficina, lanchonete, pet shop e muito mais." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-bold text-brand-800">Meu Negócio</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Começar grátis
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Controle seu negócio <span className="text-brand-700">sem complicação.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Estoque, vendas, caixa, clientes e financeiro em um só lugar. Simples o bastante para
          usar no balcão, completo o bastante para tomar decisões.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/cadastro"
            className="rounded-lg bg-brand-700 px-6 py-3 font-medium text-white hover:bg-brand-800"
          >
            Começar grátis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Já tenho conta
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">Grátis para começar. Sem cartão de crédito.</p>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <f.icon className="h-6 w-6 text-brand-700" />
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-slate-500">
        Meu Negócio — Controle seu negócio sem complicação.
      </footer>
    </main>
  );
}

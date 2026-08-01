# Meu Negócio

**Controle seu negócio sem complicação.** SaaS de gestão para pequenos negócios — estoque, vendas (PDV), clientes e dashboard, com multi-tenancy real via Row Level Security.

## Stack

Next.js 14 (App Router, Server Actions, TypeScript) · Tailwind CSS · Supabase (PostgreSQL, Auth) · Vercel.

## O que está funcionando nesta versão (v1 — núcleo)

- **Autenticação**: cadastro, login, logout, recuperação e redefinição de senha, rotas protegidas por middleware.
- **Onboarding**: nome da empresa → tipo de negócio → controla estoque? → primeiro produto → dashboard.
- **Multi-tenancy**: isolamento total por `organization_id` + RLS em todas as tabelas + validação server-side nas funções SQL (testado: uma empresa não lê nem grava dados de outra, mesmo forjando requests).
- **Produtos**: CRUD completo, busca, paginação, inativar/ativar, margem bruta, estoque mínimo com alerta.
- **Estoque**: entradas e saídas (compra, ajuste, devolução, venda, perda, avaria, consumo), histórico, bloqueio de saída sem saldo.
- **PDV / Vendas**: busca por nome/SKU/código de barras, carrinho, desconto, cliente opcional, 7 formas de pagamento. Ao finalizar (transação SQL única): grava venda + itens, baixa estoque, registra movimentação e pagamento.
- **Cancelamento**: devolve estoque, estorna pagamento, registra auditoria. Nada é apagado silenciosamente.
- **Clientes**: cadastro, total gasto, nº de compras, botão WhatsApp (abre conversa — nunca envia nada automaticamente).
- **Fornecedores**: cadastro e vínculo com compras.
- **Compras**: registro com itens, desconto e frete; dá entrada no estoque, atualiza o custo do produto e, se for a prazo, gera conta a pagar com vencimento — tudo em uma transação SQL.
- **Contas a pagar / a receber**: lançamento manual, status pendente/atrasado/pago, totais em aberto, "marcar pago/recebido".
- **Despesas**: lançamento por categoria e data, total do mês.
- **Caixa**: abertura, sangria/reforço, valor esperado calculado (abertura + vendas em dinheiro + reforços − sangrias), fechamento com conferência e diferença (bateu/faltou/sobrou), histórico de fechamentos.
- **Relatórios**: filtro por período — faturamento, nº de vendas, ticket médio, despesas, resultado, vendas por forma de pagamento, top 10 produtos.
- **Configurações**: dados da empresa, controle de estoque liga/desliga, plano atual e trial.
- **Dashboard**: vendas de hoje/mês, alertas de estoque baixo/zerado, últimas vendas.
- **Auditoria**: criação/edição/venda/cancelamento/estoque/caixa logados em `audit_logs`.
- **Landing page** com CTA "Começar grátis".

Planos Free/Basic/Pro com trial de 7 dias já estão no banco e aparecem em Configurações.

## Próxima versão (propositalmente fora desta entrega)

Cobrança automática (Stripe/Mercado Pago/Asaas), convite de usuários com permissões granulares por perfil (campo `role` e estrutura já existem no banco), importação CSV, exportação de relatórios, notificações, busca global Ctrl+K, dark mode. **Emissão fiscal está fora do escopo do produto.**

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project** (região `sa-east-1` para o Brasil).
2. Guarde a senha do banco.
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Nunca** use a `service_role` key no app — este projeto não precisa dela.

## 2. Aplicar as migrations

**Opção A — SQL Editor (mais simples):** abra o SQL Editor do Supabase e execute, na ordem, o conteúdo de:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_and_functions.sql`
3. `supabase/migrations/003_finance_schema.sql`
4. `supabase/migrations/004_purchases_cash.sql`

**Opção B — Supabase CLI:**

```bash
npm i -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## 3. Configurar Auth no Supabase

Em **Authentication → URL Configuration**:

- `Site URL`: `https://seu-dominio.vercel.app` (ou `http://localhost:3000` em dev)
- `Redirect URLs`: adicione `https://seu-dominio.vercel.app/redefinir-senha`

Em **Authentication → Providers → Email**: deixe habilitado. Se "Confirm email" estiver ativo, o usuário confirma o e-mail antes de entrar (o app já trata os dois casos).

## 4. Rodar localmente

```bash
cp .env.example .env.local   # preencha com os valores do passo 1
npm install
npm run dev                  # http://localhost:3000
```

## 5. Deploy na Vercel

1. Suba o código para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório (framework Next.js é detectado sozinho).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (a URL final, ex. `https://meunegocio.vercel.app`)
4. **Deploy**. A partir daí: `git push` → build → produção.
5. Volte ao passo 3 e atualize as URLs do Auth com o domínio final.

O projeto é 100% serverless-friendly: sem filesystem persistente, sem processos residentes, sem SQLite — todo estado vive no Supabase.

## 6. Testar produção (roteiro mínimo)

1. Criar conta → confirmar e-mail (se ativo) → login.
2. Onboarding: criar empresa e primeiro produto.
3. Estoque: registrar entrada; tentar saída maior que o saldo (deve bloquear).
4. PDV: vender com desconto; conferir baixa de estoque e pagamento na venda.
5. Cancelar a venda; conferir estoque devolvido e estorno.
6. Registrar uma compra a prazo; conferir entrada no estoque, custo atualizado e conta a pagar gerada.
7. Abrir o caixa, vender em dinheiro, fazer uma sangria e fechar conferindo o valor.
8. Criar uma **segunda conta** com outra empresa e confirmar que nada da primeira aparece.
9. Recuperar senha pelo link de e-mail.

## Estrutura

```
supabase/migrations/   4 migrations (schema, RLS+funções, financeiro, compras+caixa)
supabase/seed.sql      dados de demonstração (opcional, marcados [DEMO])
src/middleware.ts      proteção de rotas + refresh de sessão
src/lib/supabase/      clients browser/server/middleware (@supabase/ssr)
src/lib/org.ts         helper requireOrg() — auth + organização ativa
src/app/(auth)/        login, cadastro, recuperar/redefinir senha
src/app/onboarding/    criação da empresa (rpc create_organization)
src/app/app/           área logada: dashboard, produtos, estoque, pdv, vendas, clientes,
                       fornecedores, compras, contas, despesas, caixa, relatórios, configurações
src/components/ui/     componentes base (Button, Input, Card, ...)
```

## Decisões de arquitetura

- **Operações críticas em funções SQL** (`create_sale`, `cancel_sale`, `create_purchase`, `register_stock_movement`, `open/close_cash_register`, `create_organization`): transacionais, com lock de linha (`for update`) e checagem de membership dentro do banco — o frontend nunca é a única barreira.
- **RLS em todas as tabelas** usando `user_org_ids()` (security definer, evita recursão).
- **Sem service_role no app**: tudo passa pela anon key + sessão do usuário + RLS.
- **Numeração de venda por empresa** (`#1, #2…` por organização, com unique constraint).

## Troubleshooting

- **"acesso negado" nas RPCs** → o usuário não é membro da organização informada.
- **Redirect de auth quebrado em produção** → confira `NEXT_PUBLIC_SITE_URL` e as Redirect URLs no Supabase.
- **Login ok local, falha na Vercel** → variáveis de ambiente não configuradas no projeto Vercel (elas não são herdadas do `.env.local`).

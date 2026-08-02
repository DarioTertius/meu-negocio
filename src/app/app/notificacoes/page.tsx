import { requireOrg } from "@/lib/org";
import { dateTime } from "@/lib/format";
import { Button, Card, EmptyState } from "@/components/ui";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const { supabase, orgId } = await requireOrg();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, read, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = (notifications ?? []).some((n) => !n.read);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notificações</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <Button variant="outline">Marcar todas como lidas</Button>
          </form>
        )}
      </div>

      {(notifications ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma notificação."
          hint="Você será avisado aqui quando um produto ficar com estoque baixo ou zerar."
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {(notifications ?? []).map((n) => (
            <div key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-brand-50"}`}>
              <p className="text-sm font-medium">
                {!n.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-600" />}
                {n.title}
              </p>
              {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
              <p className="mt-0.5 text-xs text-slate-400">{dateTime(n.created_at)}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

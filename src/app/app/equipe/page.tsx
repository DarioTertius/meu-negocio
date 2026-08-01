import { requirePermission } from "@/lib/org";
import { dateTime } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { InviteForm, MemberActions } from "./team-forms";
import { ROLE_LABELS } from "@/lib/permissions";
import { revokeInvite } from "./actions";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { supabase, orgId, user, role } = await requirePermission("equipe");
  const canManage = role === "owner" || role === "admin";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, role, created_at")
      .eq("organization_id", orgId)
      .order("created_at"),
    supabase
      .from("invites")
      .select("id, email, role, created_at")
      .eq("organization_id", orgId)
      .is("claimed_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Equipe</h1>

      {canManage ? (
        <InviteForm />
      ) : (
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Apenas o dono ou administrador pode convidar e gerenciar usuários.
        </p>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Membros</h2>
        <Card className="divide-y divide-slate-100 p-0">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {nameById.get(m.user_id) || "Usuário"}
                  {m.user_id === user.id && <span className="text-slate-400"> (você)</span>}
                </p>
                <p className="text-xs text-slate-500">Desde {dateTime(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={m.role === "owner" ? "green" : "slate"}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </Badge>
                <MemberActions
                  userId={m.user_id}
                  currentRole={m.role}
                  canManage={canManage}
                  isSelf={m.user_id === user.id}
                />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Convites pendentes</h2>
        {(invites ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum convite pendente."
            hint={canManage ? "Convide acima. O funcionário usa o e-mail convidado para criar a conta." : undefined}
          />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {(invites ?? []).map((i) => (
              <div key={i.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABELS[i.role] ?? i.role} · convidado em {dateTime(i.created_at)}
                  </p>
                </div>
                {canManage && (
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="text-xs text-red-600 hover:underline">Revogar</button>
                  </form>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export const qty = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(v ?? 0);

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferência",
  boleto: "Boleto",
  outros: "Outros",
};

export const MOVEMENT_REASONS = {
  entrada: ["compra", "ajuste", "devolucao", "outros"],
  saida: ["venda", "perda", "avaria", "ajuste", "consumo", "outros"],
} as const;

export const REASON_LABELS: Record<string, string> = {
  compra: "Compra",
  ajuste: "Ajuste",
  devolucao: "Devolução",
  venda: "Venda",
  perda: "Perda",
  avaria: "Avaria",
  consumo: "Consumo",
  outros: "Outros",
};

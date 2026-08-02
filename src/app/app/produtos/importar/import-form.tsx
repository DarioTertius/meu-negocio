"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui";
import { brl, qty } from "@/lib/format";
import { importProducts, type ImportItem } from "../actions";

// ---------- Parser de CSV (aceita ; , ou tab; aspas; decimal com vírgula) ----
function detectDelimiter(line: string): string {
  const counts: [string, number][] = [";", ",", "\t"].map((d) => [d, line.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ";";
}

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = clean.split("\n").find((l) => l.trim() !== "") ?? "";
  const delim = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function parseNumber(v: string): number {
  const s = v.trim();
  if (s === "") return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z_]/g, "");
}

const HEADER_MAP: Record<string, keyof ImportItem> = {
  nome: "name", produto: "name", name: "name",
  sku: "sku", codigo: "sku",
  codigodebarras: "barcode", codigobarras: "barcode", barcode: "barcode", ean: "barcode",
  unidade: "unit", unit: "unit", un: "unit",
  custo: "cost", cost: "cost", precodecusto: "cost",
  preco: "price", precodevenda: "price", price: "price", valor: "price",
  estoque: "stock", quantidade: "stock", stock: "stock", qtd: "stock",
  estoqueminimo: "min_stock", minimo: "min_stock", minstock: "min_stock",
};

const TEMPLATE = `nome;sku;codigo_de_barras;unidade;custo;preco;estoque;estoque_minimo
Água mineral 500ml;AGUA500;7891234567890;un;1,20;3,00;48;12
Refrigerante lata 350ml;REFRI350;;un;2,80;6,00;30;10
Salgado assado;;;un;3,50;8,00;15;5`;

type ParsedRow = { item: ImportItem; line: number; error: string | null };

export function ImportForm() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    setResult(null);
    setError(null);
    setParseError(null);
    setRows([]);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ""));
        if (parsed.length < 2) {
          setParseError("A planilha precisa do cabeçalho e de pelo menos uma linha de produto.");
          return;
        }
        const header = parsed[0].map(normalizeHeader);
        const colIndex: Partial<Record<keyof ImportItem, number>> = {};
        header.forEach((h, i) => {
          const key = HEADER_MAP[h];
          if (key && colIndex[key] === undefined) colIndex[key] = i;
        });
        if (colIndex.name === undefined) {
          setParseError('Não achei a coluna "nome". Use o modelo para garantir os cabeçalhos.');
          return;
        }

        const get = (r: string[], k: keyof ImportItem) =>
          colIndex[k] !== undefined ? (r[colIndex[k]!] ?? "").trim() : "";

        const out: ParsedRow[] = parsed.slice(1).map((r, i) => {
          const cost = parseNumber(get(r, "cost"));
          const price = parseNumber(get(r, "price"));
          const stock = parseNumber(get(r, "stock"));
          const minStock = parseNumber(get(r, "min_stock"));
          const item: ImportItem = {
            name: get(r, "name"),
            sku: get(r, "sku") || null,
            barcode: get(r, "barcode") || null,
            unit: get(r, "unit") || "un",
            cost: Number.isNaN(cost) ? 0 : cost,
            price: Number.isNaN(price) ? 0 : price,
            stock: Number.isNaN(stock) ? 0 : stock,
            min_stock: Number.isNaN(minStock) ? 0 : minStock,
          };
          let err: string | null = null;
          if (!item.name) err = "sem nome";
          else if ([cost, price, stock, minStock].some((n) => Number.isNaN(n))) err = "número inválido";
          else if (item.cost < 0 || item.price < 0 || item.stock < 0 || item.min_stock < 0) err = "número negativo";
          return { item, line: i + 2, error: err };
        });
        if (out.length > 500) {
          setParseError(`A planilha tem ${out.length} linhas — o máximo é 500 por importação. Divida em partes.`);
          return;
        }
        setRows(out);
      } catch {
        setParseError("Não consegui ler este arquivo. Salve como CSV e tente de novo.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  const valid = rows.filter((r) => !r.error);
  const invalid = rows.filter((r) => r.error);

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await importProducts(valid.map((v) => v.item));
      if (r.error) setError(r.error);
      else {
        setResult({ inserted: r.inserted ?? 0, skipped: r.skipped ?? 0 });
        setRows([]);
        setFileName(null);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Importar produtos por planilha</h1>
        <p className="text-sm text-slate-500">
          Baixe o modelo, preencha no Excel (uma linha por produto), salve como CSV e envie aqui.
          Produtos com SKU já cadastrado são pulados — nada é sobrescrito.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={downloadTemplate}>Baixar modelo (CSV)</Button>
        <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">
          Escolher planilha…
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        <Link href="/app/produtos" className="text-sm text-brand-700 hover:underline">
          ← Voltar aos produtos
        </Link>
      </div>

      {result && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Importação concluída: <strong>{result.inserted}</strong> produto(s) cadastrado(s),{" "}
          <strong>{result.skipped}</strong> pulado(s) (SKU repetido ou linha inválida).
        </p>
      )}
      {parseError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{parseError}</p>}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {rows.length > 0 && (
        <>
          <Card className="p-0">
            <div className="border-b border-slate-200 px-4 py-2 text-sm">
              <strong>{valid.length}</strong> prontos para importar
              {invalid.length > 0 && (
                <span className="text-red-600"> · {invalid.length} com problema (linhas: {invalid.slice(0, 8).map((r) => r.line).join(", ")}{invalid.length > 8 ? "…" : ""})</span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Produto</th>
                    <th className="px-4 py-2 text-right">Custo</th>
                    <th className="px-4 py-2 text-right">Preço</th>
                    <th className="px-4 py-2 text-right">Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 60).map((r) => (
                    <tr key={r.line} className={r.error ? "bg-red-50" : ""}>
                      <td className="px-4 py-2">
                        {r.item.name || <em className="text-red-600">linha {r.line}: {r.error}</em>}
                        {r.item.sku && <span className="ml-2 text-xs text-slate-400">SKU {r.item.sku}</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{brl(r.item.cost)}</td>
                      <td className="px-4 py-2 text-right">{brl(r.item.price)}</td>
                      <td className="px-4 py-2 text-right">{qty(r.item.stock)} {r.item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 60 && (
                <p className="px-4 py-2 text-xs text-slate-400">… e mais {rows.length - 60} linhas.</p>
              )}
            </div>
          </Card>

          <Button onClick={submit} disabled={valid.length === 0 || pending}>
            {pending ? "Importando…" : `Importar ${valid.length} produto${valid.length === 1 ? "" : "s"}`}
          </Button>
        </>
      )}

      {rows.length === 0 && !result && !parseError && (
        <EmptyState
          title="Nenhuma planilha carregada ainda."
          hint="Colunas do modelo: nome, sku, código de barras, unidade, custo, preço, estoque, estoque mínimo. Só o nome é obrigatório."
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Printer, Share2, ArrowLeft } from "lucide-react";

export function ReceiptActions({ shareText }: { shareText: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // usuário cancelou — sem problema
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-2 px-2 print:hidden">
      <Button variant="ghost" onClick={() => router.back()} aria-label="Voltar">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <div className="ml-auto flex gap-2">
        <Button variant="outline" onClick={share}>
          <Share2 className="h-4 w-4" /> {copied ? "Copiado!" : "Compartilhar"}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Negócio — Controle seu negócio sem complicação",
  description:
    "Estoque, vendas, caixa, clientes e financeiro em um só lugar. Sistema de gestão simples para pequenos negócios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">{children}</body>
    </html>
  );
}

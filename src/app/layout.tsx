import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Meu Negócio — Controle seu negócio sem complicação",
  description:
    "Estoque, vendas, caixa, clientes e financeiro em um só lugar. Sistema de gestão simples para pequenos negócios.",
  manifest: "/manifest.json",
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport = {
  themeColor: "#136350",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">{children}<PwaRegister /></body>
    </html>
  );
}

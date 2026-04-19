"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalConsentModal({
  companyName,
  open,
  onAccept,
}: {
  companyName?: string | null;
  open: boolean;
  onAccept: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[rgba(36,49,77,0.42)] px-4 py-4 sm:items-center">
      <Card className="w-full max-w-2xl rounded-[2rem] border-[var(--border)] bg-[rgba(255,255,255,0.98)] shadow-[0_30px_80px_rgba(36,49,77,0.24)]">
        <CardHeader className="space-y-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="hero-pill hero-pill--dark">
              <ShieldCheck className="h-3.5 w-3.5" />
              Termos Legais
            </span>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-[-0.05em]">Termos de uso e privacidade</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              {companyName ? `${companyName} validou o seu acesso.` : "Seu acesso foi validado."} Antes de
              continuar para a triagem, revise os termos de uso e a política de privacidade aplicáveis.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--accent)] p-4">
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              Ao prosseguir, você declara ciência de que o uso da plataforma depende das regras descritas nos
              Termos de Uso e na Política de Privacidade, incluindo finalidade do tratamento, retenção,
              direitos do titular e uso operacional dos relatórios.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/termos-de-uso" className="text-sm font-semibold text-[var(--foreground)] underline-offset-4 hover:underline">
                Ler Termos de Uso
              </Link>
              <Link href="/politica-de-privacidade" className="text-sm font-semibold text-[var(--foreground)] underline-offset-4 hover:underline">
                Ler Política de Privacidade
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button onClick={onAccept}>Li e concordo</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

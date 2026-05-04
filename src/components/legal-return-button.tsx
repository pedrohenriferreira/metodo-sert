"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type LegalReturnButtonProps = {
  fallbackHref: string;
  label: string;
};

export function LegalReturnButton({ fallbackHref, label }: LegalReturnButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <Button type="button" variant="outline" onClick={handleBack}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}

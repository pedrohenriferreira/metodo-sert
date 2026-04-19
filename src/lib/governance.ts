import { createHash } from "crypto";
import {
  getConsentDisclosureText as getSharedConsentDisclosureText,
  getConsentVersion as getSharedConsentVersion,
} from "@/lib/legal";

export type ConsentRecord = {
  accepted: true;
  acceptedAt: string;
  version: string;
  text: string;
};

export function getConsentVersion() {
  return getSharedConsentVersion();
}

export function getLegalBasisLabel() {
  return process.env.LEGAL_BASIS_LABEL || "legitimo_interesse_nr1";
}

export function getRetentionDays() {
  const raw = Number(process.env.DATA_RETENTION_DAYS || "180");
  if (!Number.isFinite(raw) || raw < 1) {
    return 180;
  }

  return Math.round(raw);
}

export function calculateRetentionUntil(submittedAtIso: string) {
  const submittedAt = new Date(submittedAtIso);
  const result = new Date(submittedAt);
  result.setDate(result.getDate() + getRetentionDays());
  return result.toISOString();
}

export function buildPseudonymId(responseId: string, companyId: string) {
  return createHash("sha256")
    .update(`${companyId}:${responseId}`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}

export function getConsentDisclosureText() {
  return getSharedConsentDisclosureText();
}

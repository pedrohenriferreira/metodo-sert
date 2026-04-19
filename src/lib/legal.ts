export function getConsentVersion() {
  return process.env.NEXT_PUBLIC_CONSENT_VERSION || process.env.CONSENT_VERSION || "04-2026";
}

export function getConsentDisclosureText() {
  return "Autorizo o tratamento dos dados desta resposta para avaliação de riscos psicossociais, geração de indicadores agregados e priorização de cuidado, conforme a política de privacidade aplicável.";
}

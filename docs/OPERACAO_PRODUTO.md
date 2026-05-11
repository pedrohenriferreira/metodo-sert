# Operacao do Produto

## Onboarding admin
1. Configurar `.env` com banco, segredo de sessao e credenciais admin.
1.1. Se o fluxo de demonstracao for usado, configurar SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`) ou `DEMO_REQUEST_WEBHOOK_URL`.
2. Rodar `npx prisma generate`.
3. Rodar `npm run db:push`.
4. Entrar em `/admin` com `ADMIN_USER` e `ADMIN_PASS`.
5. Criar a empresa e distribuir os tokens individuais.

## Fluxo principal
1. Colaborador valida token.
2. Preenche triagem.
3. Registra consentimento.
4. Envia a escala.
5. Sistema grava resposta, prazo de retencao e identificador pseudonimizado.
6. Empresa ou admin podem exportar relatorio CSV pseudonimizado.

## Observabilidade minima
- `GET /api/health` para verificar saude da aplicacao e do banco.
- Logs estruturados de erro via `captureServerError`.
- Eventos auditados persistidos em `AuditEvent`.

## Atendimento operacional
- Falha de token:
  revisar `Token` no painel e, se preciso, resetar token individual.
- Falha de envio:
  verificar logs do servidor, `AuditEvent`, configuracao SMTP/webhook e `GET /api/health`.
- Falha de acesso admin:
  reiniciar app e validar `.env`.

## Evolucoes recomendadas
- Paginacao em listagens do admin quando a base crescer.
- Playwright para fluxo E2E completo.
- Integracao com Sentry/Axiom/Datadog.
- Recuperacao formal de acesso admin.
- Manual do cliente final e FAQ operacional.

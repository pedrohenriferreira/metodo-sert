# Método Sert · MVP

Check-in de riscos psicossociais (NR-1) com questionário Likert e dashboard em tempo real. Inclui controle de tokens individuais por empresa para liberar o formulário.

## Rodar local
```bash
npm install
npm run dev
# http://localhost:3000
```

## Tokens e empresas
- Defina a chave de administração em `.env.local`:
```
ADMIN_KEY=escolha-uma-chave-forte
ADMIN_USER=admin
ADMIN_PASS=senha-forte
```
- Crie tokens para uma empresa (um por colaborador):
```bash
curl -X POST http://localhost:3000/api/companies \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Empresa Exemplo","seats":25}'
```
A resposta contém `company.tokens[]` com os códigos a distribuir aos colaboradores.

- Validar um token (antes do envio do formulário):
```bash
curl -X POST http://localhost:3000/api/tokens/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKENAQUI"}'
```

## Fluxo de coleta
- Landing redireciona para `/form`.
- Primeiro valida-se o token (tela dedicada). Só depois o formulário aparece.
- Ao enviar, o token é consumido e o usuário é redirecionado para `/dashboard?view=<id_da_resposta>`.
- Dashboard: `/dashboard` só responde se receber `view` válido (ou `x-admin-key` para uso interno).
- Respostas ficam em `data/responses.json`; empresas e tokens em `data/companies.json`.

## Estrutura principal
- `src/app/page.tsx`: redireciona para `/form`.
- `src/app/form/page.tsx`: formulário + validação de token.
- `src/app/dashboard/page.tsx`: dashboard protegido por `view` (ou admin key).
- `src/app/admin/page.tsx`: painel protegido para gerar empresas/tokens.
- `src/app/api/responses/route.ts`: grava respostas, valida token, calcula métricas.
- `src/app/api/tokens/validate/route.ts`: valida tokens.
- `src/app/api/companies/route.ts`: criação e listagem (chave admin).
- `src/app/api/admin/login|logout`: autenticação de sessão admin.
- `src/lib/questions.ts`: itens da escala.
- `src/lib/metrics.ts`: cálculo de médias por dimensão e pergunta.
- `src/lib/storage.ts`: persistência em arquivos JSON, geração/uso de tokens.

## Próximos passos sugeridos
1. Trocar persistência por banco (SQLite/Prisma) para produção.
2. Expor dashboard filtrado por empresa/time e exportação CSV.
3. Configurar deploy (ex.: Vercel + storage externo) e HTTPS.

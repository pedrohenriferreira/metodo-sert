# Método Sert · MVP

Check-in de riscos psicossociais (NR-1) com questionário Likert e dashboard em tempo real. Inclui controle de tokens individuais por empresa para liberar o formulário.

## Rodar local
```bash
npm install
npx prisma generate
npm run dev
# http://localhost:3000
```

## Configuração
- Defina as variáveis em `.env.local`:
```bash
DATABASE_URL="postgresql://postgres.SEU-PROJECT-REF:SUA-SENHA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:SUA-SENHA@db.SEU-PROJECT-REF.supabase.co:5432/postgres?sslmode=require"
ADMIN_KEY=escolha-uma-chave-forte
ADMIN_USER=admin
ADMIN_PASS=senha-forte
```

## Banco de dados
- Para usar Supabase:
  1. Crie um projeto no Supabase.
  2. Em `Project Settings > Database`, copie a `Connection string`.
  3. Use a URL do `pooler` em `DATABASE_URL`.
  4. Use a conexão direta (`db.<project-ref>.supabase.co:5432`) em `DIRECT_URL`.
- Aplicar o schema no PostgreSQL:
```bash
npm run db:push
```
- Importar os dados atuais dos arquivos JSON para o banco:
```bash
npm run db:import-json
```

## Tokens e empresas
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
- Respostas, empresas e tokens ficam persistidos em PostgreSQL.

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
1. Adicionar migrations versionadas e pipeline de banco para produção.
2. Expor dashboard filtrado por empresa/time e exportação CSV.
3. Configurar deploy (ex.: Vercel + storage externo) e HTTPS.

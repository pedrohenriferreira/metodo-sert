# Governanca de Dados e LGPD

## Finalidade
- Avaliar riscos psicossociais e priorizar cuidado em contexto organizacional.
- Gerar indicadores agregados para empresa contratante.
- Permitir leitura individual protegida e leitura organizacional pseudonimizada.

## Base legal operacional
- Base padrao da aplicacao: `legitimo_interesse_nr1`.
- Consentimento explicito: coletado no formulario antes do envio.
- Versao do consentimento: controlada por `CONSENT_VERSION`.

## Minimizacao e pseudonimizacao
- O relatorio CSV operacional exporta `participante_id` pseudonimizado, sem token e sem `responseId`.
- Tokens nao sao incluidos no relatorio de respostas.
- O dashboard individual continua protegido por token ou sessao administrativa.

## Quem pode ver o que
- Colaborador com token individual:
  pode enviar resposta e reabrir apenas sua leitura individual.
- Empresa com token institucional:
  pode abrir a visao organizacional e exportar relatorio pseudonimizado.
- Admin com sessao autenticada:
  pode gerenciar empresas, tokens, exclusoes operacionais e exportacoes.

## Retencao
- Prazo padrao: `DATA_RETENTION_DAYS`, com default de 180 dias.
- Cada resposta recebe `retentionUntil` no momento do envio.
- Recomenda-se rotina periodica de exclusao ou arquivamento apos esse prazo.

## Exclusao
- Exclusao operacional de resposta ja existe no painel admin.
- Exclusao institucional deve seguir procedimento interno com registro do pedido e evidencias.
- Toda exclusao relevante deve aparecer na trilha de auditoria.

## Trilha de auditoria
- Eventos criticos sao gravados em `AuditEvent`.
- Exemplos: login admin, logout, criacao/exclusao de empresa, manipulacao de token, exportacao de relatorio.

## Proximos passos recomendados
- Adicionar rotina automatica de purge por `retentionUntil`.
- Registrar solicitacoes do titular em tabela propria.
- Revisar mascaramento adicional de time/funcao em bases pequenas.
- Formalizar politica externa de privacidade e atendimento LGPD.

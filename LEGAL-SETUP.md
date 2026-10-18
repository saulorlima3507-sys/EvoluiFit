# EvoluFit — Termos, Privacidade e registro de aceite

## Situação desta entrega

A implementação está testada em navegador e banco local. A publicação inicial disponibiliza os documentos como **minutas para consulta**. O cadastro obrigatório com comprovante no servidor está preparado na branch `feat/termos-aceite-2026-10-18` e depende dos passos abaixo. Não há acesso administrativo ao Supabase nesta sessão; nenhuma migração foi executada remotamente nem comprovante de usuário real foi inventado.

**Responsável informado:** Saulo Samuel Reinholz Lima. Contato de suporte/privacidade: saulorlima3507@gmail.com. A identificação fiscal informada consta dos documentos públicos. O endereço e demais pontos [PREENCHER] continuam destacados. Alterações futuras devem criar nova versão, sem reescrever textos já aceitos.

## Revisão dos documentos antes de ativar

- Preencher endereço de contato. O responsável optou por permitir novos cadastros somente a maiores de 18 anos; há validação no formulário, na função e no banco. Contas preexistentes são preservadas.
- Validar configuração dos fornecedores, transferências internacionais e mecanismos aplicáveis; não assumir que a simples escolha do fornecedor comprova conformidade.
- Definir os critérios/prazos operacionais de retenção, exclusão e atendimento. O cancelamento de conta no servidor é solicitado ao contato informado; não há botão automático para isso.
- Conferir os textos com assessoria jurídica, considerando a operação efetiva. Os textos não prometem imunidade de responsabilidade ou certificação LGPD.
- O checkbox contratual não é consentimento genérico de LGPD. Há uma segunda autorização destacada para dados de saúde, necessária à personalização atual, com finalidade e canal de revogação específicos. Ela não autoriza anúncios.

Os arquivos de elaboração são `work/legal-18/build-documents.py` e `work/legal-18/build-migration.py`. Para mudanças **antes de qualquer aceite real**, edite a versão em elaboração, gere novamente documentos/manifesto/migração e repita os testes. Após ativação e primeiro aceite, preserve o arquivo antigo e utilize uma nova versão para qualquer alteração de conteúdo. Textos inteiros e SHA-256 são guardados no banco e em URLs versionadas.

## Instalação no Supabase (sem apagar históricos)

1. No projeto Supabase já usado pela EvoluFit, abra **Edge Functions → evoluifit-account → Código**. Substitua pelo arquivo `supabase/functions/evoluifit-account/index.ts` desta entrega e implante. Mantenha `Verify JWT` do gateway desativado: cadastro/login são públicos e leitura de conta valida o token no código. Não copie chaves administrativas para o site ou chat.
2. Abra **SQL Editor → New query**, cole **todo** o arquivo `supabase/migrations/202610180001_legal_acceptance.sql` e clique em **Run**. Ele depende da instalação de contas já existente, é repetível e não apaga perfis/CPFs/históricos. Não cria aceites para contas anteriores. Não reexecute a migração antiga depois desta sem reaplicar esta atualização, pois a rota antiga de provisionamento deve permanecer sem permissão de execução.
3. Confira a configuração, ainda desativada:
   ```sql
   select public.evoluifit_legal_configuration();
   ```
   Deve retornar versões e hashes correspondentes a `legal-manifest.json`, com `ready: false`. Login de contas existentes continua disponível. Novos cadastros ficam temporariamente suspensos durante a instalação, até o passo seguinte.
4. **Depois de resolver as pendências dos documentos e conferir os textos**, ative a versão revisada no SQL Editor:
   ```sql
   update evoluifit_private.legal_configuration set active = true where id = 1;
   select public.evoluifit_legal_configuration();
   ```
   `ready` passa a `true`. Se gerar uma nova versão na revisão, instale a migração correspondente e ajuste os identificadores da configuração à versão revisada; não reutilize identificador com conteúdo diferente.
5. Publicar os arquivos da interface da branch preparada em `gh-pages`, incluindo `conta.html`, `conta-legal-1.js`, documentos, manifestos e leitor. A publicação inicial de minutas usa o cadastro anterior até a configuração remota ficar pronta; não copiar só o script novo para um HTML antigo.
6. Testar no site real: não aceitar → mensagem obrigatória; ler ambos os textos → formulário preservado; aceitar as duas declarações → cadastro; entrar → menu **Termos, privacidade e meu aceite** → horário/versões retornados pelo servidor.

## Conferência do comprovante no SQL Editor

Após um cadastro de teste autorizado, substitua o UUID pelo identificador da conta criada:
```sql
select user_id, accepted_at, terms_version, privacy_version,
       terms_sha256, privacy_sha256, health_consent_version
from public.evoluifit_legal_acceptances
where user_id = 'UUID-DA-CONTA';
```
Não altere o timestamp do servidor nem crie comprovantes para contas que não fizeram as declarações. Não use dados pessoais de outras pessoas para testes.

## Garantias técnicas e limites

- A função valida declarações, versões e hashes **antes** de criar conta de autenticação.
- Perfil, CPF e comprovante são criados numa transação. Falha ao gravar aceite reverte perfil/CPF; a função de conta compensa a criação da conta de autenticação quando necessário.
- `accepted_at` é gerado pelo banco; não vem do relógio do navegador. O UUID identifica a conta. Não é coletado IP/fingerprint adicional para o aceite.
- Usuários autenticados leem somente seus próprios comprovantes via RLS, sem permissão de inserir, editar ou apagar recibos. Apenas a função de servidor cria o registro. A rota antiga sem aceite é revogada.
- Versões, hashes, declaração contratual e autorização específica ficam guardados. O arquivo completo de cada documento é preservado numa tabela privada, com verificação SHA-256.
- Ler novamente não muda data/versão do aceite. Contas antigas exibem ausência de comprovante; não são cadastradas retroativamente.
- O registro comprova a declaração vinculada à conta, não identidade civil verificada ou leitura de cada parágrafo. A aplicação não faz validação de identidade pelo CPF.
- Históricos locais, fotos legadas, favoritos, vídeos e configurações de tema não são migrados nem apagados por esta atualização.

## Preparar ambiente local

Execute `npm ci` na raiz e `npm ci --prefix work/accounts/sql-test` para as dependências do teste PostgreSQL. O navegador de testes utiliza Chromium em `/usr/bin/chromium`, ou o caminho em `CHROMIUM_PATH`.

## Testes realizados

- `node tests/legal-acceptance.cjs`: leitura integral/integração, mensagem exata, caixas desmarcadas, aceite obrigatório, autorização destacada, confirmação do servidor, formulário preservado, versões/comprovante, quatro larguras e dois temas, integridade do documento.
- `node work/legal-18/sql-test.cjs`: migração repetida, preservação, ausência de aceites antigos, permissões, relógio do banco, versões/hashes, bloqueio da rota antiga, rollback de perfil e CPF se recibo falhar.
- `node work/accounts/backend-test.cjs`: validação no servidor, rejeição de aceite ausente/antigo e autorização de saúde ausente, prontidão, CPF/login, limites e limpeza de falha.
- `node tests/accounts.cjs`, `node tests/improvements.cjs`, `node tests/update-18.cjs`: regressões de cadastro, login, isolamento, histórico, treinos, calendário, receitas e tema.

Testes simulados e locais não substituem a ativação e a conferência do Supabase real.

# EvoluiFit — revisão de segurança, 18/10/2026

## Escopo e resultado
Revisão do código do site, do cliente de autenticação, da função de contas e da migração SQL disponíveis no repositório. Testes automatizados em navegador com API simulada e em PostgreSQL local (PGlite). Não é uma auditoria independente nem uma garantia de ausência de falhas.

## Melhorias aplicadas no site
- A sessão no sessionStorage passa a conter exclusivamente access_token, refresh_token e expires_at. Dados antigos adicionais são removidos ao carregar o cliente. Senha e CPF não são persistidos pelo cliente.
- Requisições simultâneas compartilham uma única renovação de token. Uma renovação que termina após o logout não restaura a sessão encerrada.
- Falhas na confirmação do acesso ocultam o aplicativo, fecham janelas pessoais e pausam vídeos. Retorno pelo histórico do navegador exige nova confirmação da sessão. Logout mantém os registros locais de treino e alimentação.
- Tentativas repetidas de conferir a conta não carregam cópias do aplicativo. Mudança de identidade exige recarregar o estado separado por conta.
- CSP em todas as quatro páginas limita scripts ao próprio site e conexões ao projeto Supabase configurado. Fotos das capas ficam no próprio site; fontes e licenças são links opcionais. Fotos de perfil continuam no bucket privado com URL temporária.
- Novos registros de receitas validam data e ID, rejeitam datas futuras e evitam duplicatas. Não usam respostas do questionário nem acrescentam dados de saúde ao serviço de contas.

## Controles existentes conferidos no código e testes
- Senhas são processadas pelo Supabase Auth. Apenas a chave pública publishable aparece no cliente; credenciais privilegiadas permanecem na função de servidor.
- A função de perfil valida o token com o servidor antes de consultar os dados. Login por CPF usa consulta privilegiada sem expor o e-mail ao visitante e respostas genéricas para credenciais inválidas.
- A migração habilita RLS no perfil; cada conta lê apenas sua própria linha. O CPF fica em esquema privado. Funções de provisionamento, consulta por CPF e limite de tentativas não são executáveis por anon/authenticated.
- Testes de PostgreSQL verificam isolamento de perfis, privacidade do CPF, restrição de escrita, validação e limites de tentativas. Testes da função verificam autenticação, provisionamento, tratamento de erros e limpeza quando o cadastro falha.
- Nenhum novo serviço de analytics ou publicidade foi adicionado. O player de vídeo externo continua dependendo de acionamento do usuário.

## Limites que permanecem
- O ambiente desta revisão não tem acesso administrativo ao Supabase. RLS, políticas do bucket, secrets e o código efetivamente implantado precisam ser comparados com os arquivos revisados no painel. Os testes locais não comprovam essas configurações em produção.
- O GitHub Pages hospeda arquivos públicos. A tela de login protege a apresentação dos dados pessoais no aplicativo, mas HTML, receitas e vídeos públicos não são um controle de acesso comercial. Dados de conta dependem da autenticação no backend.
- Histórico de treinos, medidas e receitas fica em localStorage, separado por conta, sem criptografia nem sincronização automática. Quem controla o dispositivo/perfil do navegador pode acessá-lo. Sair da conta encerra a sessão; exportar registros permite uma cópia de segurança.
- Tokens no sessionStorage são acessíveis ao JavaScript da mesma origem. CSP e ausência de scripts de terceiros reduzem a exposição, mas não substituem uma arquitetura de sessão com cookies HttpOnly em um servidor próprio.
- A confirmação de e-mail permanece desativada conforme a decisão anterior do responsável. Não há comprovação de titularidade do e-mail.
- Headers adicionais do servidor de teste não são prova de headers no GitHub Pages; as restrições publicadas no HTML foram mantidas na revisão.

## Validação
`node tests/accounts.cjs`, `node tests/improvements.cjs`, `node tests/onboarding-recipes150.cjs`, `node tests/update-18.cjs`, `node work/accounts/sql-test/check.cjs` e `node work/accounts/backend-test.cjs`.

Nenhuma migração ou exclusão de banco foi necessária para esta atualização. Históricos anteriores e arquivos antigos de fotos corporais foram preservados; a interface de fotos corporais não foi reintroduzida.

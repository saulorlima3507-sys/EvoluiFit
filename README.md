# EvoluiFit

Primeira versão funcional de um site responsivo para treinos, receitas e acompanhamento. O repositório original tinha apenas este README; a aplicação foi construída em HTML, CSS e JavaScript, sem framework e sem dependências de produção.

O visual foi revisado com navegação escura, destaque verde-lima, títulos maiores, cartões com ícones, ilustrações próprias para cada receita e atalhos para os registros. Toda a interface usa recursos locais: não depende de fontes ou imagens externas. Extraia o ZIP inteiro mantendo `index.html`, `styles.css` e `app.js` juntos na mesma pasta para que o visual carregue corretamente.

A versão interativa inclui treino guiado, séries marcáveis, cronômetro de descanso, receitas favoritas e checklists. Os exercícios de academia têm **9 demonstrações com pessoas reais**, por Goulart, obtidas no wger e redistribuídas em **CC BY-SA 4.0**. Cada player identifica a execução mostrada e eventuais diferenças em relação ao plano. Arquivos locais MP4/H.264 sem áudio, capas e legendas em português; reprodução apenas por ação do usuário. Os 6 vídeos de receitas continuam sendo guias animados originais.

Não há filmagens adequadas no catálogo consultado para as versões em casa, prancha e dead bug. Esses exercícios mantêm as instruções escritas e um aviso de indisponibilidade, sem animação ou filmagem de outro movimento. As 9 filmagens são: agachamento com barra, supino com halteres, remada na polia, levantamento romeno, avanço com halteres, desenvolvimento com halteres, barra fixa assistida, hip thrust e panturrilha em pé. Variações são identificadas no player sem alterar a prescrição nem os registros.

Fontes, URLs originais, autoria, licença e transformações: [créditos dos vídeos](media/credits.json). Os vídeos foram redimensionados, convertidos para H.264, tiveram o áudio removido e receberam legendas separadas; as adaptações permanecem sob CC BY-SA 4.0.
## Navegação simplificada

O menu principal tem cinco opções: **Início, Treinos, Receitas, Progresso e Calendário**. Peso/altura e fotos ficam juntos em Progresso. O botão **Meu plano**, no topo, abre os dias disponíveis, objetivo e dados locais. Em Treinos, escolha **Meu treino da semana** ou **Aprender movimentos**. Os sete dias aparecem sem rolagem horizontal e indicam Treino ou Livre. **Começar treino** ativa a marcação de séries; o calendário continua registrando a data de hoje.

A área Aprender movimentos contém orientações gerais em texto para aquecimento, corrida, alongamento e fortalecimento. Em 14/10/2026, o acesso HTTPS a wger.de e às APIs de vídeos, exercícios e licenças funcionou. Os arquivos são hospedados junto ao site, sem chamadas externas durante o treino.
## Abrir no computador

1. Instale o **Node.js 20 ou superior** (a versão LTS é recomendada).
2. Use o ZIP mais recente, **EvoluiFit-atualizado.zip**, e extraia a pasta `EvoluiFit`, ou salve os arquivos alterados no seu computador. Enquanto estas alterações não forem enviadas ao GitHub, baixar/clonar `main` traz apenas o README original. Depois de enviar as alterações, também será possível usar **Code → Download ZIP** ou clonar com Git:
   ```sh
   git clone --branch gh-pages https://github.com/saulorlima3507-sys/EvoluiFit.git
   cd EvoluiFit
   ```
3. Abra um terminal na pasta extraída que contém `package.json` (por exemplo, `EvoluiFit`) e execute:
   ```sh
   npm start
   ```
4. Abra **http://127.0.0.1:3000** no navegador. Encerre com `Ctrl+C` no terminal.

Não é necessário `npm install` para usar o site. O servidor usa apenas módulos nativos do Node. Se a porta estiver ocupada: `PORT=3001 npm start` no macOS/Linux ou `$env:PORT=3001; npm start` no PowerShell. Nesse caso, abra a porta escolhida.

Use sempre o mesmo navegador, perfil e endereço: `localhost` e `127.0.0.1`, assim como portas diferentes, têm armazenamentos separados. Abrir `index.html` diretamente não é a forma recomendada, pois o armazenamento em endereços `file://` varia por navegador.

Para experimentar no celular na mesma rede local, use `HOST=0.0.0.0 npm start` (macOS/Linux) ou `$env:HOST='0.0.0.0'; npm start` (PowerShell), permita a porta no firewall e abra `http://IP-DO-COMPUTADOR:3000`. Faça isso apenas em rede confiável; o servidor não tem autenticação nem TLS. Os dados do celular serão independentes dos dados do computador.

## Funções

- Perfil: objetivo, experiência, disponibilidade, academia e idade; preferências podem ser alteradas.
- Planos de 2 ou 3 dias de corpo inteiro; 4 dias alternando parte superior/inferior; 5 dias com 4 sessões de força e 1 de recuperação ativa. Os dias são distribuídos automaticamente, não escolhidos individualmente. Volume: 2 séries para iniciantes, 3 para intermediários e 4 para experientes.
- Exercícios com execução, músculos, séries/repetições, regressões, progressões e alternativas de academia e casa. Algumas alternativas domésticas usam mochila ou barra própria, indicadas no exercício.
- Treino guiado: inicie a sessão, marque/desmarque séries e acompanhe a porcentagem. A conclusão só é liberada depois de todas as séries e registra o treino no calendário. As séries ficam salvas localmente e a sessão de hoje pode ser retomada após recarregar. O plano e o equipamento identificam a sessão. O registro é sempre na data de hoje, mesmo ao consultar outro dia da semana.
- Cronômetro de 60 ou 90 segundos: iniciar, pausar, retomar e reiniciar. Marcar uma série inicia o descanso selecionado. O cronômetro é reiniciado ao recarregar; as séries permanecem. Não há som ou notificações externas; descanse mais se precisar.
- Seis receitas acessíveis com porções, ingredientes, preparo e observações sobre substituições/restrições.
- Receitas interativas: marque os ingredientes separados, avance/volte nas etapas e conclua cada passo. Salve receitas no coração e filtre as favoritas. Checklist, etapas e favoritos persistem neste navegador; “Recomeçar preparo” limpa o checklist daquela receita, preservando os favoritos.
- Peso e altura por data, histórico, gráfico e IMC. Um registro por data; salvar novamente atualiza. Excluir remove do gráfico. Datas futuras e valores fora dos limites são recusados.
- O IMC é uma referência, não um diagnóstico. Sem idade, não há classificação; abaixo de 18 anos, nenhuma classificação adulta é aplicada. A interpretação pediátrica deve ser profissional. O perfil guarda idade informada, não data de nascimento: atualize a idade quando necessário.
- Fotos locais JPEG/PNG/WebP (até 10 MB), redimensionadas para até 1200 px, convertidas para JPEG sem os metadados originais, comparação lado a lado e exclusão individual.
- Calendário com marcação/desmarcação de dias passados ou atuais. Não registra exercícios individuais, apenas a conclusão do dia.
- Exportação JSON de perfil, medidas, calendário, séries, favoritos e checklists (sem fotos); exclusão de todos os dados em Meu plano e dados.

## Dados e limites da demonstração

Perfil, medidas, calendário, séries, checklists e receitas favoritas ficam no `localStorage`; fotos, no `IndexedDB`. Não há backend, autenticação, cookies de rastreamento, analytics, anúncios ou envio de registros e imagens. O servidor só entrega a página, os arquivos públicos da aplicação e a lista explícita de vídeos/capas/legendas; não recebe uploads nem expõe a pasta inteira. A política de segurança bloqueia conexões externas da aplicação. SVGs e guias de receitas são originais; as demonstrações de exercícios de Goulart/wger são redistribuídas sob CC BY-SA 4.0 junto ao site, sem players externos. Na versão pública, o navegador baixa os arquivos do próprio site, como em qualquer página; nenhuma interação de acompanhamento transmite registros pessoais.

Dados não sincronizam entre dispositivos e não têm backup automático. Limpar dados do navegador, usar modo privado ou atingir a cota de armazenamento pode afetá-los. As fotos são locais, mas **não estão protegidas por login ou criptografia própria**: alguém com acesso ao mesmo perfil do navegador pode vê-las. Apagar os registros remove as entradas do armazenamento da aplicação, sem promessa de apagamento forense do disco. Evite dispositivos compartilhados. Não há importação/restauração de JSON nesta versão; a exportação permite guardar e consultar os registros.

Treinos e receitas são sugestões gerais, não uma prescrição profissional. Não prometemos perda de gordura, ganho muscular nem resultados garantidos. Pessoas com lesões ou condições de saúde devem buscar orientação. Menores precisam de adaptação profissional e acompanhamento responsável.

## Pagamento e integrações futuras

O preço planejado é **R$ 24,99 por acesso vitalício, em uma única compra**. A demonstração é gratuita e aberta. Não há compra simulada, checkout, cartão, cobrança nem desbloqueio falso. O botão de demonstração explica a proposta e as integrações necessárias.

Para vender no site:

1. Definir provedor, condições de acesso vitalício, suporte, reembolso e termos de venda.
2. Implementar contas reais e backend seguro para criar sessões de checkout hospedado. Manter credenciais fora do navegador.
3. Validar webhooks assinados, valor/moeda e identidade da transação; implementar idempotência, reembolso e autorização persistente do acesso. Nunca liberar acesso apenas com um redirecionamento de sucesso no frontend.
4. Testar em sandbox antes de ativar produção e ajustar política de privacidade/LGPD.

Para um aplicativo: esta entrega é um site com aparência de app, **não um app nativo nem uma PWA instalável/offline**. Será necessário empacotar ou construir o aplicativo, configurar as lojas e integrar compras de conteúdo digital conforme as regras vigentes de Apple e Google, com validação de recibos e restauração de compras. Revisar regras e preço antes de publicar. Sincronizar entre web e app exigirá contas e backend.

Meta: nenhuma integração ou campanha foi criada. Uma etapa futura pode configurar conta comercial, conta de anúncios e consentimento, além de Pixel/Conversions API no site ou SDK no app quando permitido. Não incluir peso, IMC, fotos corporais nem outros dados de saúde em eventos publicitários. Campanhas exigem uma tarefa e autorização próprias.

## Estrutura

```text
index.html         Estrutura e navegação
styles.css         Visual responsivo e acessibilidade
app.js             Rotinas, receitas, registros e armazenamento local
server.mjs         Servidor estático, sem API de dados
tests/smoke.cjs    Teste funcional no Chromium com perfil isolado
tests/review.cjs   Revisão de planos, validações, armazenamento e layout
tests/interactive.cjs  Séries, timer, checklists, favoritos e 28 players
tests/navigation.cjs   Cinco menus, modos de treino e semana sem rolagem
media/            Vídeos MP4, capas JPEG e legendas VTT
scripts/          Fonte dos guias e gerador opcional de vídeos
package.json       Comandos e dependência de teste
package-lock.json Dependências de teste fixadas
```

## Testar

```sh
npm ci
npx playwright install chromium
npm test
```

Em uma máquina que já tenha Chromium instalado, não é preciso baixar o navegador:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm test
```

No PowerShell, defina `$env:CHROMIUM_PATH='CAMINHO-DO-CHROMIUM'` e execute `npm test`. No ambiente de nuvem, se o cache padrão do npm não for gravável, use `npm ci --cache /tmp/evoluifit-npm-cache`.

Os testes abrem servidores próprios nas portas 3101, 3102, 3103 e 3105 e perfis temporários: não alteram dados reais. Cobrem configuração, rotinas, receitas, medidas/IMC, menores, calendário, upload/comparação/exclusão de fotos, persistência, exportação, pagamento demonstrativo e limpeza. A revisão também exercita 24 combinações de dias, níveis e equipamento, os três objetivos, todos os dias da semana, dados inválidos e armazenamento bloqueado. O layout é verificado em 320, 390, 600, 768, 950, 1024 e 1440 px, incluindo o carregamento do CSS e os rótulos de navegação. A suíte interativa testa todos os 28 vídeos com reprodução e avanço real, as legendas, as requisições parciais, sessões de treino, cronômetro, favoritos, ingredientes e etapas, incluindo persistência, exportação e limpeza. Para alterar o site, edite os arquivos e recarregue o navegador; não há etapa de build.

Os testes foram executados no Chromium. As larguras móveis simulam telas de celular; ainda é recomendável testar Safari/iOS e aparelhos reais antes de publicar para usuários.

## Autoria e atualização dos guias

Os vídeos são originais do EvoluiFit e já estão prontos em `media/`; nenhum gerador é necessário para usar o site. Para recriar os arquivos em Linux, use Python 3 com Pillow, FFmpeg com libx264 e as fontes DejaVu Sans em `/usr/share/fonts/truetype/dejavu/`, depois execute `python3 scripts/build-guides.py`. `scripts/guide-data.json` contém somente o conteúdo público das receitas e exercícios, não registros de usuários.

Os desenhos são esquemáticos e têm limitações anatômicas. As legendas e o texto explicam os pontos essenciais; não substituem demonstração e avaliação presencial de um profissional. Os guias culinários representam etapas resumidas, não o tempo real de cozimento. Para incluir filmagens reais no futuro, escolha material autorizado, confirme técnica/preparo e mantenha legendas e instruções equivalentes.


## Atualização de 18/10/2026

- Receitas preparadas podem ser registradas por data no próprio detalhe ou no calendário. Concluir o passo a passo registra o preparo de hoje. A contagem de treinos permanece independente.
- As 150 receitas têm capas fotográficas ilustrativas de alimentos/pratos, com fotos reutilizadas e créditos/licenças nos detalhes. Não são fotografias do preparo exato. Fontes em `media/recipe-cover-credits.json`; fotos hospedadas localmente em `media/recipe-covers/`.
- Modo claro/escuro em todas as páginas. A primeira visita acompanha o sistema; o botão de tema guarda a escolha neste navegador.
- Sessão reduzida aos tokens necessários, renovação compartilhada e bloqueio de janelas pessoais em falha de verificação.
- Teste desta atualização: `npm run test:update-18`. Relatório: `SECURITY-REVIEW-2026-10-18.md`.
- Nenhuma migração necessária. Registros de receitas ficam no histórico local por UUID, sem apagar checklists, favoritos ou dados anteriores. Checklists antigos não recebem datas de preparo inventadas.


## Termos e Privacidade — implementação preparada

Documentos completos, leitor dentro do cadastro, aceite obrigatório e autorização específica para dados de saúde, recibo com relógio do servidor/versões/hashes e consulta pela conta. A ativação do cadastro com comprovante depende da migração e da função no Supabase, além da revisão dos campos pendentes dos documentos. A fase inicial no site publica minutas para leitura; não afirma que novos aceites já estão sendo registrados. Veja `LEGAL-SETUP.md`. Teste: `npm run test:legal`. Não foram inventados aceites de usuários antigos nem apagados históricos locais.

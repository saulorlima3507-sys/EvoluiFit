# EvoluiFit

Site estático publicado pela branch `gh-pages`: https://saulorlima3507-sys.github.io/MEU-SITE-FITNESS/ . Sem build ou dependências de produção.

## Vídeos com pessoas reais

Nove filmagens por Goulart, via wger.de, redistribuídas sob CC BY-SA 4.0. [Fontes, autoria, licença e adaptações](media/credits.json). As adaptações permanecem sob CC BY-SA 4.0: conversão para MP4/H.264, redimensionamento, remoção de áudio, capas e legendas separadas em português. Sem cortes ou alteração de velocidade. Acesso ao wger e às APIs confirmado em 14/10/2026.

Cobertura: agachamento com barra, supino com halteres, remada na polia, romeno com halteres, avanço com halteres, desenvolvimento com halteres, puxada assistida, hip thrust e panturrilha em pé. Cada player identifica diferenças em relação ao plano; a prescrição permanece igual.

O catálogo consultado não forneceu filmagens adequadas para as versões em casa, prancha e dead bug. Esses exercícios exibem instruções escritas e aviso de indisponibilidade. As animações de treino foram removidas da publicação. Os seis guias animados de receitas permanecem.

## Registros locais

Mantidos `evoluifit-v1` no localStorage e `evoluifit-photos` no IndexedDB, versão 1, coleção `photos`. Sem migração, limpeza ou envio de registros. Continue no mesmo endereço, navegador e perfil para acessar seus dados. Os vídeos são servidos pelo próprio site, sem player externo.

## Validação

No Chromium: reprodução e busca por trechos dos nove vídeos, legendas, treino guiado, persistência, navegação, layout responsivo e fotos. Teste de atualização comparou exatamente o conteúdo do localStorage, séries e bytes das fotos no IndexedDB, sem diferenças. O servidor local também validou requisições parciais de vídeo. O domínio github.io é bloqueado pela rede do ambiente de execução; a implantação é acompanhada pelo workflow Pages no GitHub Actions.

## Acesso aos vídeos e tela de pagamento de teste

Em Treinos, a opção **Vídeos com pessoas reais** abre as nove demonstrações em qualquer plano, inclusive em casa. Os exercícios sem filmagem têm um botão para essa biblioteca, mantendo a identificação de que os vídeos disponíveis usam equipamentos de academia.

Em Acesso vitalício, **Testar pagamento com Pix** abre uma simulação com QR ilustrativo. Esse QR abre o próprio site EvoluiFit; não contém Pix, não gera cobrança nem confirma pagamento. Nenhum registro ou acesso é alterado.

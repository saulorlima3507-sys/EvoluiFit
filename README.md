# EvoluiFit

Site estático publicado pela branch `gh-pages`: https://saulorlima3507-sys.github.io/MEU-SITE-FITNESS/ .

## Calistenia / em casa e Academia

Em Treinos, escolha a modalidade. Cada exercício tem seu próprio vídeo dentro do cartão, junto das instruções, séries e repetições. O antigo botão para uma galeria genérica foi removido.

São 22 associações: 11 exercícios por modalidade. Prancha e dead bug usam a mesma demonstração nas duas modalidades, porque a execução é a mesma. As duas entradas de remada com mochila em casa também usam a mesma demonstração desse movimento.

As instruções, equipamentos e versões fáceis/difíceis são específicos da modalidade. O seletor usa os valores existentes `gym: yes/no`, preservando as chaves de sessões e o histórico anterior. Alternar para a modalidade anterior permite retomar suas séries na mesma data.

## Fontes e reprodução

[Catálogo por exercício e modalidade](media/exercise-videos.json).

Quatro vídeos locais de academia, por Goulart via wger.de, sob CC BY-SA 4.0: supino com halteres, remada na polia, romeno com halteres e desenvolvimento com halteres. [Créditos e adaptações](media/credits.json). Conversão para MP4/H.264, redimensionamento, remoção de áudio, capa e legendas separadas; adaptações sob CC BY-SA 4.0.

As demais demonstrações são incorporadas no player oficial do YouTube, a partir dos canais dos autores. Não foram baixadas ou redistribuídas. Direitos permanecem com seus autores; reprodução depende das permissões do autor e da disponibilidade do serviço. Cada player tem o crédito e um link direto para o vídeo específico, caso a incorporação seja bloqueada. Há demonstrações em português e em inglês, com instruções da aplicação em português.

O player externo só carrega após tocar em Assistir, dentro do exercício. Fechar o exercício encerra o player; o vídeo fica pausado. Antes do clique, nenhum serviço externo é carregado. A CSP do servidor local permite somente o domínio youtube-nocookie.com para frames; os registros não são enviados ao YouTube. O player tem política de referência própria para permitir a identificação da origem exigida pelo serviço.

Os seis guias animados de receitas foram substituídos na interface por vídeos dos canais dos autores. Os arquivos antigos foram preservados no repositório. Os vídeos antigos de academia com outras variações continuam preservados nos arquivos, mas não são usados para ilustrar exercícios diferentes.

## Registros locais

Mantidos `evoluifit-v1` no localStorage e `evoluifit-photos` no IndexedDB, versão 1, coleção `photos`. Sem migração ou limpeza. Use o mesmo endereço, navegador e perfil para acessar seus dados.

## QR ilustrativo

Acesso vitalício → Testar pagamento com Pix abre uma simulação com QR que abre o próprio EvoluiFit. Não é Pix, não gera cobrança nem confirma pagamento.

## Validação

Testes no Chromium cobrem as 22 associações exercício/modalidade, abertura do vídeo correto dentro de cada cartão, troca de modalidade, preservação de séries e layout em 320/390/768/1440 px. Os quatro vídeos locais tiveram reprodução e busca por trechos verificadas.

A rede do ambiente bloqueia o YouTube. Por isso, o teste dos embeds verifica a URL, a política de referência e o ciclo de abertura/fechamento usando uma resposta simulada; não constitui comprovação de reprodução dos vídeos externos. Títulos, autores e descrições foram consultados nas fontes. Há fallback para abrir o vídeo específico no YouTube. A implantação é acompanhada pelo GitHub Actions; github.io também é bloqueado no ambiente.

A atualização da versão anterior foi testada comparando o conteúdo exato do localStorage e os bytes das fotos no IndexedDB, sem diferenças.

## 35 receitas com vídeos

A área Receitas tem 35 opções nas categorias Café da manhã, Refeições, Lanches, Acompanhamentos e Doces e sobremesas. Há busca por nome ou ingrediente, filtros de categoria e favoritas.

Cada receita abre ingredientes, porções, tempo estimado, checklist, etapas marcáveis e um player do vídeo correspondente. Há Shorts e vídeos de preparo mais completos, sem duração inventada. Fontes e autores em [media/recipe-videos.json](media/recipe-videos.json). Os vídeos são incorporados pelo player oficial do YouTube, sem cópia ou redistribuição. Carregam apenas quando solicitado e são removidos ao fechar a janela. Há link para o vídeo específico no canal do autor.

As receitas escritas são versões adaptadas do EvoluiFit, com possíveis diferenças de ingredientes, quantidades e porções em relação ao vídeo de referência; essa informação aparece junto ao player. Tempos ativos de overnight oats e pudim de chia indicam o tempo adicional de geladeira.

Os índices, ingredientes e etapas das seis receitas anteriores foram preservados para manter o significado dos favoritos e checklists existentes. O carregamento dos registros agora valida os limites a partir do catálogo completo de 35 receitas, incluindo o salvamento e a restauração de favoritos/checklists das receitas novas. Nenhuma migração ou limpeza é executada.

Testes no Chromium: 35 receitas completas, associação do player específico de cada receita, busca sem acentos, filtros, favoritas, checklists antigos e novos após recarregar, fechamento do player e layout móvel. O teste externo usa uma resposta simulada porque a rede do ambiente bloqueia o YouTube; não comprova reprodução externa.

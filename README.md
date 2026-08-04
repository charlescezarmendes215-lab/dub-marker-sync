# Dub Marker 

Crie uma aplicação web voltada para celulares (Mobile-First) chamada "DubMarker App".



OBJETIVO DA APLICAÇÃO:

Um sistema automatizado de organização de scripts e gerador de marcadores visuais de tempo para dubladores e estúdios de minisséries/dramas curtos. O aplicativo permite carregar uma planilha de dublagem (.xlsx), selecionar um DUBLADOR/ATOR específico (ex: Charles, Guilherme, Barbara), filtrar automaticamente todas as cenas em que o personagem dele aparece e gerar arquivos de marcação (.SRT) para o CapCut, além de permitir o download dos vídeos de cada cena.



REQUISITOS E LÓGICA DE FUNCIONAMENTO (CRÍTICO):



1. PROCESSAMENTO AUTOMÁTICO DE PLANILHA MULTI-ABAS (SEM MAPEAR COLUNAS MANUAMENTE):

- Não exiba tela de mapeamento manual de colunas. Ao subir a planilha (ex: 22535_Poppy_The_Little_Witch_pt.xlsx), o sistema deve ler e cruzar as abas automaticamente:

  * Aba 'Character List': Ler a coluna 'Voice Actor' (Dublador/Ator) e cruzar com a coluna 'Labeled Role' (Nome do Personagem).

  * Aba 'pt_Dialogue' (ou qualquer aba _Dialogue): Extrair os códigos de tempo ('Timecode' ou 'Start/End Timecode'), o texto da fala ('Translated Text' ou 'Source Text'), o personagem ('Labeled Role') e o número do episódio ('Episode No.').

  * Aba 'Video Download Link': Vincular o número do episódio ao link direto do vídeo MP4.



2. FILTRO POR DUBLADOR / ATOR (COMBOBOX COM BUSCA INTEGRADA):

- A seleção principal de filtro DEVE ser feita pelo NOME DO DUBLADOR/ATOR (extraído da coluna 'Voice Actor'), e NÃO pelo nome do personagem nem por nuvem de botões.

- Use um componente de busca único (Combobox/Autocomplete). Quando o usuário digitar "Charles" ou "Guilherme", o campo deve filtrar em tempo real no formato: "Nome do Dublador — Nome do Personagem (Total de Falas)" (Exemplo: "Charles — Morgan Cross (123 falas)" ou "Guilherme — Victor Blackwood (361 falas)").

- Ao selecionar o dublador, o aplicativo deve buscar automaticamente na aba de diálogos todas as falas do personagem correspondente.



3. EXPORTAÇÃO DE MARCADORES PARA O CAPCUT (.SRT):

- O gerador de SRT NÃO deve colocar o texto longo da fala na tela (pois os vídeos originais já possuem legendas). O arquivo SRT deve gerar apenas blocos de marcação curtos e limpos na linha do tempo contendo o identificador do ator/personagem (exemplo: "[Charles]" ou "🎙️").

- RECALCULO DE TIMECODE: Os tempos de início e fim no arquivo SRT devem ser RECALCULADOS e ZERADOS (00:00:00) para o início de cada arquivo de vídeo/episódio individual, garantindo que as marcações não fiquem desalinhadas ou jogadas no final da linha do tempo do CapCut.

- Fornecer opção de "Exportar SRT por Episódio" para sincronização perfeita no CapCut.



4. CORREÇÃO DE MEMÓRIA NO DOWNLOAD DE VÍDEOS (MOBILE):

- Para evitar que o navegador do celular trave ou dê erro de falta de memória ("Out of Memory / Aw, Snap") ao tentar compactar muitos vídeos HD em um arquivo ZIP:

  * O botão "Baixar Vídeos" deve realizar downloads sequenciais individuais (um arquivo por vez com intervalo de 1,5s) exibindo uma barra de progresso.

  * Disponibilizar também o botão "Exportar Lista de Links (.txt)" para que o usuário possa colar todos os links de uma vez em gerenciadores de download mobile (como 1DM ou ADM).



DESIGN E INTERFACE (UI/UX):

- Interface moderna em modo escuro (Dark Theme mobile-first).

- Layout limpo, sem poluição de telas intermediárias.

- Visualização das cenas em cartões contendo o episódio, timecode e link de prévia.

CORREÇÃO CRÍTICA DE DOWNLOAD DE VÍDEOS NO CELULAR:



Problema: 

O botão "Baixar vídeos (sequencial)" está abrindo o player de vídeo no Chrome ou baixando apenas o 1º arquivo devido ao bloqueio de pop-ups/downloads múltiplos do navegador mobile.



POR FAVOR, APLIQUE AS SEGUINTES ALTERAÇÕES:



1. FORÇAR DOWNLOAD VIA BLOB/FETCH (SEM ABRIR PLAYER):

- Em vez de usar `<a href="..." download>`, faça o fetch do arquivo como Blob e force o download com um elemento ancorado dinâmico ou use `window.URL.createObjectURL(blob)`.

- Adicione o atributo download explicitamente com o nome formatado (ex: "Episodio_29_Charles.mp4").



2. MODAL DE DOWNLOAD COM AÇÃO MANUAL DO USUÁRIO (PARA BURLAR O BLOQUEIO DO CHROME):

- O Chrome bloqueia o download de 8 arquivos seguidos sem clique do usuário. 

- Crie um Modal/Popup de Download quando o usuário clicar em "Baixar vídeos (sequencial)".

- Dentro do modal, liste os botões de download de cada episódio um embaixo do outro, e adicione um botão principal "Baixar Próximo (1 de 8)".

- Conforme o usuário clica em "Baixar", o app faz o download do MP4 e automaticamente avança o destaque para o "Episódio 30", "Episódio 31", etc. Isso garante que o navegador autorize 100% dos downloads sem abrir o player.



3. COPIAR TODOS OS LINKS / ARQUIVO .TXT:

- Garanta que o botão "Exportar lista de links (.txt)" baixe um arquivo limpo contendo apenas as URLs dos MP4s, permitindo que o usuário use aplicativos como o ADM ou 1DM para baixar todos os vídeos da lista de uma só vez na galeria.

CORREÇÃO CRÍTICA NA EXPORTAÇÃO DO ARQUIVO SRT (CAPCUT COMPATIBILITY):



Problema:

O CapCut exibe o erro "Compatível somente com arquivos SRT, LRC ou ASS" ao tentar importar o arquivo baixado.



CAUSA TÉCNICA E SOLUÇÃO:



1. FORÇAR EXTENSÃO .srt E MIME TYPE CORRETO:

- Certifique-se de que o arquivo seja baixado estritamente com a extensão `.srt` (exemplo: `Episodio_29_Charles.srt` ou `Marcadores_Charles.srt`).

- Defina o MIME Type do arquivo Blob como `text/plain;charset=utf-8` ou `application/x-subrip`.



2. ESTRUTURA E FORMATAÇÃO PADRÃO SRT STRICT:

- O arquivo deve seguir a sintaxe exata do padrão SubRip SRT sem nenhuma linha extra no topo ou tags malformadas:



1

00:00:04,519 --> 00:00:05,159

🎙️ [Charles]



2

00:00:08,100 --> 00:00:10,250

🎙️ [Charles]



- Use vírgula `,` para separar os milissegundos (ex: `00:00:01,500`), pois pontos `.` em milissegundos fazem o CapCut mobile rejeitar o arquivo.

- Salve a codificação obrigatoriamente em UTF-8 simples.

CORREÇÃO CRÍTICA DE FILTRAGEM E EXIBIÇÃO DE MARCADORES SRT:



Problemas identificados:

1. O arquivo SRT gerado está incluindo falas de OUTROS personagens (como no trecho "Agora o Victor está zangado"), em vez de filtrar EXCLUSIVAMENTE as falas de quando o dublador selecionado (Charles / Morgan Cross) fala.

2. O texto "🎙️ [Charles]" está aparecendo visível no centro do vídeo.



POR FAVOR, APLIQUE AS SEGUINTES CORREÇÕES DE LÓGICA E CONTEÚDO:



1. FILTRAGEM ESTRITA DE FALAS NO SRT:

- Ao exportar o SRT para um Dublador/Ator (ex: Charles), inclua no arquivo APENAS E TÃO SOMENTE os blocos de timecode onde o personagem atribuído a ele ('Morgan Cross') realmente possui uma fala registrada na planilha.

- Se outro personagem estiver falando naquele momento, NÃO crie bloco de SRT nesse intervalo de tempo.



2. TEXTO INVISÍVEL / MARCADOR LIMPO:

- Para que o marcador funcione na timeline sem aparecer nenhum texto na tela do vídeo:

  * Substitua o conteúdo do texto por um caractere invisível (como um espaço em branco ` ` ou Unicode ` `) ou simplesmente um ponto `.`.

  * Isso garante que na linha do tempo do CapCut os blocos amarelos continuem indicando a entrada e saída exata da voz do Charles, mas nada fique cobrindo a imagem do vídeo original!

CORREÇÃO DE LÓGICA NO GERADOR SRT: FILTRAR ARRAY ANTES DE GERAR O ARQUIVO



Problema:

Mesmo selecionando o ator "Charles", o arquivo SRT baixado contém os timecodes de TODOS os personagens do episódio (ex: inclui falas da personagem loira/ruiva aos 00:55s).



CAUSA NO CÓDIGO E SOLUÇÃO:

O backend/função `generateSRT()` está fazendo um loop em toda a lista de diálogos do episódio (`episodeDialogues.map`), em vez de filtrar estritamente pela voz do ator selecionado.



POR FAVOR, ALTERE O CÓDIGO DO GERADOR SRT PARA:



1. FILTRAGEM RIGOROSA DO ARRAY:

- Antes de mapear e criar os blocos de timecode, aplique um `.filter()` rigoroso:

  `const actorDialogues = allDialogues.filter(item => item.characterName === selectedActorCharacter);`



2. GERAR O SRT APENAS COM OS ITENS FILTRADOS:

- Construa o arquivo SRT apenas com os elementos de `actorDialogues`.

- Se em um episódio o Charles tiver apenas 2 falas, o arquivo SRT DEVE ter EXATAMENTE 2 blocos de timecode. Não inclua nenhum timecode das falas dos outros atores da cena.



3. MANTER CONTEÚDO LIMPO (ESPAÇO EM BRANCO):

- Mantenha o texto de cada bloco apenas como um espaço em branco " " (para o bloco amarelo existir na timeline do CapCut sem mostrar texto na tela).

FIX SRT DOWNLOAD FAILURE (PREVENT EMPTY/NULL BLOB ERROR):



Problem: 

Clicking "Exportar SRT" or "SRT" results in "Falha em 1 download" on Android/Chrome. This happens when the string content fails to build or results in an empty Blob.



REQUIRED CODE FIX IN THE SRT GENERATION FUNCTION:



1. SAFELY FILTER DIALOGUES FIRST:

- Make sure the array filtering doesn't return undefined/null values.

  Example logic:

  const filteredLines = dialogues.filter(line => 

    line.actor === selectedActor || line.character === selectedCharacter

  );



2. FALLBACK CONTENT FOR BLOCKS:

- Each subtitle block MUST contain valid text content (even if it's just a space " " or a period "."). An SRT block with an empty text line causes parsing/download bugs.

  Format:

  1

  00:00:01,240 --> 00:00:01,260

   



3. SAFE BLOB DOWNLOAD METHOD:

- Ensure the Blob is created safely as text/plain:

  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');

  a.href = url;

  a.download = `Episodio_${ep}_${actorName}.srt`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);

CORREÇÃO DEFINITIVA: DOWNLOAD DE SRT VIA BASE64 DATA-URI (SEM BLOB / SEM COPY)



Problema:

O usuário NÃO pode colar texto no CapCut; o aplicativo exige um ARQUIVO .SRT físico baixado no celular. O método com URL.createObjectURL/Blob está falhando no Chrome Mobile.



SOLUÇÃO TÉCNICA OBRIGATÓRIA:



1. GERAR DOWNLOAD VIA BASE64 DATA URI DIRECT:

Substitua toda a lógica de download de SRT para usar Base64 Data URI diretamente em um elemento de link <a> simples, sem chamadas assíncronas de Blob no evento de clique:



const base64Srt = btoa(unescape(encodeURIComponent(srtContent)));

const downloadUrl = `data:application/x-subrip;base64,${base64Srt}`;



- O botão "SRT" deve ser um elemento <a> estilizado com:

  href={downloadUrl}

  download={`Episodio_${ep}_${actorName}.srt`}



2. MANTER A ESTRUTURA LIMPA DO SRT:

- O conteúdo `srtContent` deve incluir APENAS os timecodes do ator selecionado (ex: Charles).

- Cada bloco deve ter como texto apenas um espaço " " para criar o marcador na timeline sem exibir legendas na tela.



Essa abordagem garante que o Chrome do celular trate o clique como um download de arquivo direto da própria página, sem mensagens de falha!

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dub-marker-sync.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21d44dc7-cb5b-4076-ae43-04a0b45afe29).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

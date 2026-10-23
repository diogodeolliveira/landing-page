# Pizzaria das Famílias · DESIGN.md (versão 3.6, 22/10/2026: WhatsApp e botões de contato)

Site em `site/`, refeito do zero a partir dos três vídeos de referência (zip `drive-download…`):
- **ÉCLAT**: escuro, a pizza montada pela rolagem (farinha, massa, molho, cobertura, forno), letreiro de ingredientes, faíscas flutuando, cardápio em cartões.
- **PRIME**: preto e amarelo, visual de "HUD" (cantoneiras, rótulos `// 01`), números acesos, hambúrguer "explodido" com legendas, montador com preço.
- **Editorial food film**: comida que se separa no ar conforme a rolagem.

## O que tem na página
1. **A pizza montada em vídeo** (versão 8 do topo, 22/10/2026). O vídeo enviado (`gemini_generated_video_b8b087d1.mp4`, 10 s) ocupa toda a largura do topo e é conduzido pela rolagem: rolar para baixo avança o filme, rolar para cima volta. A bola de massa cai na farinha, a massa aberta, o molho espalhado com a colher, o queijo, a calabresa, a cebola e as azeitonas, o orégano e a pizza pronta. As legendas acompanham o filme:
   - 01 A massa, 02 O molho, 03 O queijo, 04 A cobertura, 05 O orégano e 06 Pronta. Cada etapa tem o seu trecho de rolagem, e os cortes do filme passam numa faixa curta; um brilho quente do forno cobre o corte para a pizza pronta.
   - Sobre o vídeo, uma sombra à esquerda e embaixo mantém o título e os botões legíveis. No celular o vídeo fica no alto, na largura da tela, e o texto embaixo.
   - O vídeo foi recodificado sem áudio, com quadro-chave a cada 4 quadros, para avançar e voltar sem travar: `site/assets/video/montagem-720.mp4` (1280 × 720, 3,8 MB, computador) e `montagem-480.mp4` (854 × 480, 2 MB, celular), com a primeira imagem como pôster (`montagem-poster.webp`). O arquivo é baixado inteiro antes de entrar; até lá aparece o pôster. O original fica guardado na pasta e não é publicado.
   - Com "reduzir movimento", o vídeo não toca sozinho: a rolagem escolhe o quadro.
   Os botões "Reservar mesa" e "Ver o buffet" ficam fixos o tempo todo. As camadas recortadas da foto (versões 6 e 7) saíram do site.
2. Letreiro, **A casa** (frase + logo aceso), **números** acesos (7 dias, 4h, pizzas, porções e comida japonesa à vontade, com um ∞ em neon e as 4 categorias de pizza na legenda; 10 convidados **pagantes** e o aniversariante não paga). A seção A casa tem ao fundo a foto da fachada à noite (`site/assets/img/fachada-noite.webp`), com o texto sobre o céu escuro à esquerda. Abaixo do texto, dois botões: "Nos conheça melhor" (abre o Instagram @pizzariadasfamilias_) e "Fale conosco" (abre o WhatsApp (41) 3669-6782 com um "Olá! Vim pelo site" pronto).
3. **O balcão**: 4 cartões com desenhos em linha amarela que se desenham ao entrar na tela.
4. **Experiências**: espaço kids e aniversário.
5. **Espaço kids monitorado** (no lugar das avaliações do Google, a pedido): foto do espaço kids (`site/assets/img/espaco-kids.webp`) com as cantoneiras amarelas, e três pontos: monitorado, incluso no buffet, 0 a 4 anos não pagam e 5 a 8 pagam meia. No menu, "Avaliações" virou "Espaço kids".
6. **Bom saber** (regras em linhas que abrem), **Reserva** com calendário (chegada das 19h às 20h, de 15 em 15 minutos; lembrete de que o aniversariante só ganha o buffet com 10 convidados pagantes; caixa obrigatória "Li e concordo com os termos da reserva", que remete ao Bom saber; aviso para aguardar a confirmação pelo WhatsApp), **Visite** com letreiro gigante.

As imagens usadas são as enviadas na conversa (fachada à noite, espaço kids) e o vídeo da montagem. Os fatos vêm do manual "regras e funcionamento pizzaria.pdf".

## Realismo da pizza
- O topo usa o vídeo enviado, com ingredientes reais filmados, no lugar das camadas recortadas.
- O vídeo tem 1280 × 720; em telas grandes ele é ampliado para cobrir a largura e fica um pouco macio. Uma versão em 1920 × 1080 do mesmo vídeo deixaria tudo mais nítido (basta trocar o arquivo e recodificar do mesmo jeito).

## Identidade
- Preto `#050505`, amarelo da marca `#FCF10C` (brilho `rgba(252,241,12,.5)`), branco neutro `#F4F4F2`.
- Tipos: Big Shoulders Display (títulos), Big Shoulders Inline (números acesos), Barlow e Barlow Condensed (texto e rótulos), Cormorant Garamond itálico (frases de destaque, como no ÉCLAT).
- Botões com canto cortado, cantoneiras de HUD, grão de filme por cima de tudo.

## Movimento
Curvas `cubic-bezier(0.23, 1, 0.32, 1)` e `(0.77, 0, 0.175, 1)`. Com "reduzir movimento" ligado no sistema, a pizza continua sendo montada pela rolagem (é você quem controla, sem suavização), mas param as faíscas, o letreiro, o vapor, a farinha no ar, o tranco da câmera e os movimentos automáticos. Para ver tudo nesse caso: `?movimento=completo`. No rodapé há um botão "Pausar animações".

## Contato
- WhatsApp (41) 3669-6782 (`CONFIG.whatsapp` = `554136696782` em `site/assets/js/main.js`): o pedido de reserva abre o WhatsApp com a mensagem pronta. O mesmo número aparece em "Fale conosco", no rodapé e na linha "Em casa" do Bom saber.
- Instagram @pizzariadasfamilias_: botão "Nos conheça melhor" e rodapé.

## A confirmar com a pizzaria
- Endereço e telefone vieram do perfil do Google: Rua Maria Antonieta dos Santos, 300, Maria Antonieta, Pinhais, PR, 83331-000 · (41) 3669-6782. Falta só o link de delivery, se houver.
- Itens citados nos cartões a partir das fotos antigas (picanha, salmão, presunto e queijo, pizza de morango). Sobremesa: fondue de frutas.
- Regra do aniversário: considerei o aniversariante adulto e as crianças de meia como pagantes.

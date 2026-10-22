# Pizzaria das Famílias · DESIGN.md (versão 3.2, 21/10/2026: novo topo)

Site em `site/`, refeito do zero a partir dos três vídeos de referência (zip `drive-download…`):
- **ÉCLAT**: escuro, a pizza montada pela rolagem (farinha, massa, molho, cobertura, forno), letreiro de ingredientes, faíscas flutuando, cardápio em cartões.
- **PRIME**: preto e amarelo, visual de "HUD" (cantoneiras, rótulos `// 01`), números acesos, hambúrguer "explodido" com legendas, montador com preço.
- **Editorial food film**: comida que se separa no ar conforme a rolagem.

## O que tem na página
1. **A pizza nasce na bancada enquanto você rola** (versão 4 do topo, 21/10/2026; Three.js e GLSL, desenhada em código). Seis cenas ligadas à rolagem, com causa e consequência:
   - **A massa**: bancada escura de pedra com um pouco de farinha, luz quente de lado em foco de luz, farinha caindo de leve no ar. A bola de massa entra pelo alto, a câmera acompanha a queda; no contato ela achata, quica e se acomoda, a câmera dá um tranco e uma nuvem de farinha se espalha rente à bancada (cada grão segue uma trajetória com arrasto e gravidade, calculada na placa de vídeo) e deixa rastros e grumos na bancada. Depois a massa é esticada até virar o disco, já com a borda.
   - **O molho**: a concha desce cheia, inclina, o fio de molho cai (primeiro uma gota, depois o fio, que afina e se solta), forma uma poça no centro, e o fundo da concha espalha o molho em espiral até a borda.
   - **O queijo**: a mussarela cai em chuva, como de uma mão que dá a volta na pizza, em duas passadas; cada fio quica de leve, e a camada aparece exatamente onde os fios caem.
   - **A cobertura**: calabresa posta uma a uma, em arco e girando, desacelerando até o lugar; depois cebola e azeitona. É o sabor da etiqueta da casa (calabresa, cebola e azeitona).
   - **O forno**: orégano em chuva lenta, o brilho do forno doura borda e queijo, e o manjericão cai devagar, balançando como folha.
   - **Pronta**: a câmera se aproxima em três quartos, com vapor e um leve movimento de câmera e luz (sem giro contínuo).
   Os botões "Reservar mesa" e "Ver o buffet" ficam fixos no canto durante toda a sequência. A rolagem nunca é bloqueada; com animação ligada, a história acompanha a rolagem com uma leve suavização. A vista explodida "Por dentro" e as etiquetas saíram, porque a nova narrativa termina na revelação.
2. Letreiro, **A casa** (frase + logo aceso), **números** acesos (7 dias, 4h, 4 categorias: tradicionais, especiais, nobres e doces; 10 convidados **pagantes** e o aniversariante não paga).
3. **O balcão**: 4 cartões com desenhos em linha amarela que se desenham ao entrar na tela.
4. **Experiências**: espaço kids e aniversário.
5. **Avaliações no Google**: nota 4,4 com 734 avaliações (outubro de 2026), um trecho curto em destaque com o nome da autora e um resumo, em palavras nossas, do que mais aparece nas avaliações. Os textos completos ficam no Google (botão "Ver as avaliações"). A calculadora de preço foi retirada a pedido.
6. **Bom saber** (regras em linhas que abrem), **Reserva** com calendário, **Visite** com letreiro gigante.

Nenhuma foto da pasta é usada. Os fatos vêm do manual "regras e funcionamento pizzaria.pdf".

## Realismo da pizza (JavaScript + GLSL)
- Tudo é gerado em código: não há modelos 3D, fotos nem vídeos de comida no projeto. A massa é uma malha que se deforma (bola, impacto, disco com a mesma borda da pizza), a farinha são partículas com física pré-calculada, o molho tem fio, poça e espalhamento em espiral, o queijo são fios 3D em queda com a camada revelada onde caem.
- Pós-processamento em GLSL só no computador: foco de lente macro (o que cai e a pizza nítidos, o resto desfocado) e brilho suave nos pontos de luz. No celular fica desligado e há menos partículas.
- Para chegar a fotorrealismo de verdade faltam recursos que não existem na pasta: (1) uma sequência de imagens ou vídeo filmado ou renderizado da massa caindo e da farinha (por exemplo 150 a 200 quadros, 1920 px, fundo preto), tocada quadro a quadro pela rolagem; (2) um modelo 3D escaneado da pizza pronta (glTF com texturas PBR); (3) texturas PBR de alta resolução de massa, molho, mussarela e calabresa; (4) fotos de estúdio dos ingredientes com fundo transparente.
- Para testar um momento específico da sequência há o modo `?debug` (só expõe a cena no console).

## Identidade
- Preto `#050505`, amarelo da marca `#FCF10C` (brilho `rgba(252,241,12,.5)`), branco neutro `#F4F4F2`.
- Tipos: Big Shoulders Display (títulos), Big Shoulders Inline (números acesos), Barlow e Barlow Condensed (texto e rótulos), Cormorant Garamond itálico (frases de destaque, como no ÉCLAT).
- Botões com canto cortado, cantoneiras de HUD, grão de filme por cima de tudo.

## Movimento
Curvas `cubic-bezier(0.23, 1, 0.32, 1)` e `(0.77, 0, 0.175, 1)`. Com "reduzir movimento" ligado no sistema, a pizza continua sendo montada pela rolagem (é você quem controla, sem suavização), mas param as faíscas, o letreiro, o vapor, a farinha no ar, o tranco da câmera e os movimentos automáticos. Para ver tudo nesse caso: `?movimento=completo`. No rodapé há um botão "Pausar animações".

## A confirmar com a pizzaria
- Número do WhatsApp (`CONFIG.whatsapp` em `site/assets/js/main.js`). Sem ele, a reserva abre o Instagram e copia a mensagem.
- Endereço e telefone vieram do perfil do Google: Rua Maria Antonieta dos Santos, 300, Maria Antonieta, Pinhais, PR, 83331-000 · (41) 3669-6782. Falta só o link de delivery, se houver.
- Itens citados nos cartões a partir das fotos antigas (picanha, salmão, presunto e queijo, pizza de morango). Sobremesa: fondue de frutas.
- Atualizar a nota e o número de avaliações de tempos em tempos (estão fixos no HTML).
- Regra do aniversário: considerei o aniversariante adulto e as crianças de meia como pagantes.

# Tibia Timer

Cronômetro de poções, anéis e amuletos do Tibia, por vocação.

## Funcionalidades

- Seleção de vocação: **EK** (Elite Knight), **ED** (Elder Druid), **MS**
  (Master Sorcerer), **RP** (Royal Paladin) e **MK** (Monk).
- Quatro cronômetros, em painéis com a cara do HUD do Tibia (barra de
  título escura, bordas finas, botão de recolher):
  - **Poção de buff** — fixa por vocação, 10 min (Berserk, Bullseye,
    Mastermind ou Transcendence Potion), com a imagem do item.
  - **Amuleto** — Collar of [Red/Blue/Green/Orange] Plasma, com imagem,
    nome editável e duração ajustável manualmente entre 00:00 e 30:00.
  - **Anel** — Ring of [Red/Blue/Green/Orange] Plasma, mesma lógica do
    amuleto.
  - **Timer Livre** — objetivo (nome) e duração totalmente livres, pra
    qualquer outra coisa que você queira cronometrar.
- Avisa com som, **narração por voz** (em 1 minuto e em 30 segundos,
  mais um apito nos 30s e ao zerar) e notificação do navegador, e
  reinicia sozinho até você pausar — amuleto e anel sempre voltam para
  30:00 nesse reinício automático.
- O narrador escolhe automaticamente a **melhor voz em português
  disponível no navegador** (dá pra trocar manualmente também) —
  Chrome e Edge costumam ter vozes em nuvem de qualidade bem melhor que
  a voz padrão do sistema, de graça, sem precisar de nenhum serviço
  externo.
- **Atalho de teclado** configurável para iniciar/pausar todos os
  cronômetros de uma vez.
- Segunda aba, **Loot Splitter** (`/loot`): cola o texto do "Party Hunt
  Analyser" do jogo e calcula quem deve pagar quem pra todo mundo
  sair com o mesmo lucro — réplica da lógica do
  [tibiamaps.io/tools/loot](https://tibiamaps.io/tools/loot).
- **Modo escuro** (padrão): painéis com a cara do HUD do Tibia (barra de
  título escura, bordas finas, botão de recolher) sobre um visual mais
  "site oficial" — fundo escuro, laranja de marca e fonte de destaque,
  inspirado em [tibia.com](https://www.tibia.com/news/?subtopic=latestnews).
- Não precisa de login nem banco de dados — tudo roda no navegador
  (localStorage guarda suas preferências).

## Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Publicando na Vercel

1. Crie uma conta em https://vercel.com e importe este repositório.
2. Não é preciso configurar nenhuma variável de ambiente.
3. Clique em **Deploy** — pronto, a Vercel te dá um link público.

## Referências

Itens e durações conferidos em
[tibia.fandom.com/wiki/TibiaWiki](https://tibia.fandom.com/wiki/TibiaWiki)
e [tibiawiki.com.br](https://www.tibiawiki.com.br/wiki/Home).

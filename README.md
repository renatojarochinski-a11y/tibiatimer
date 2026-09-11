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
- Avisa com som, **narração por voz** (nos últimos 30 segundos) e
  notificação do navegador, e reinicia sozinho até você pausar.
- **Atalho de teclado** configurável para iniciar/pausar todos os
  cronômetros de uma vez.
- **Modo escuro** (padrão), com visual inspirado nos painéis laterais do
  HUD do Tibia.
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

# Tibia Timer

Cronômetro de poções, anéis e amuletos do Tibia, por vocação.

## Funcionalidades

- Seleção de vocação: **EK** (Elite Knight), **ED** (Elder Druid), **MS**
  (Master Sorcerer), **RP** (Royal Paladin) e **MK** (Monk).
- Três cronômetros, cada um com a imagem do item correto pra vocação
  selecionada:
  - **Poção de buff** — fixa por vocação, 10 em 10 minutos (Berserk,
    Bullseye, Mastermind ou Transcendence Potion).
  - **Amuleto** — Collar of [Red/Blue/Green/Orange] Plasma, 30 em 30
    minutos (nome pode ser ajustado manualmente).
  - **Anel** — Ring of [Red/Blue/Green/Orange] Plasma, 30 em 30 minutos
    (nome pode ser ajustado manualmente).
- Avisa com som, **narração por voz** (nos últimos 30 segundos) e
  notificação do navegador, e reinicia sozinho até você pausar.
- **Atalho de teclado** configurável para iniciar/pausar todos os
  cronômetros de uma vez.
- **Modo escuro** com visual inspirado no Tibia (padrão).
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

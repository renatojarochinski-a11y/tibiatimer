# Tibia Timer

Cronômetro de poções e anéis/amuletos do Tibia, por vocação.

## Funcionalidades

- Seleção de vocação: **EK** (Elite Knight), **ED** (Elder Druid), **MS**
  (Master Sorcerer), **RP** (Royal Paladin) e **MK** (Monk).
- Cronômetro de **poções de buff** (10 em 10 minutos), com o item sugerido
  por vocação (Berserk, Bullseye, Mastermind — editável).
- Cronômetro de **anéis/amuletos** (30 em 30 minutos), também editável.
- Avisa com som (beep) e notificação do navegador, e reinicia sozinho até
  você pausar.
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

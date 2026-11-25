@AGENTS.md

# Revezo

Web app instalável (PWA) para pagar menos pelas assinaturas que a pessoa já usa: monta um rodízio de
streaming mês a mês, mostra o que ela paga em dobro (serviço avulso que um pacote já inclui) e quando um
pacote sai mais barato, e avisa por e-mail e push quando assinar e cancelar. Público: Brasil. Interface em português.

## Produto

Promessa: "pague só pelas assinaturas que se pagam". O app recomenda assinar algo só quando a conta
fecha para o uso daquela pessoa, e mostra a conta: nunca uma vitrine que empurra gastos.
Dor: a pessoa paga por serviço parado, paga em dobro sem perceber (avulso + pacote que já inclui)
e não sabe o que vale a pena. Público inicial: quem tem 3+ assinaturas, caçadores de lançamentos e
quem já tem um pacote (Meli+, Amazon Prime, combo de operadora).

O app faz quatro coisas: (1) aponta o que é pago em dobro e o pacote mais barato; (2) diz quais
assinaturas se pagam com o uso da pessoa (compras, delivery, mobilidade, streaming); (3) monta o rodízio
de streaming mês a mês; (4) avisa (e-mail, push, WhatsApp) quando assinar, cancelar, antes de renovar e
quando um preço ou combo muda.
Não entra na conta do usuário, não é catálogo de descoberta e não controla finanças em geral.
Receita: afiliados + premium barato; regra pública: recomendar sempre o mais barato para o que a pessoa quer ver.

Hipóteses ainda não validadas: as pessoas seguem o rodízio? agem ao descobrir que pagam em dobro?
pagam pelo premium?

## Escopo

- Dentro: streaming (rodízio), pacotes de assinatura (Meli+, combos de operadora; depois iFood Clube,
  Uber One, música) e conteúdo comparativo ("vale a pena o Meli+?") como porta de entrada.
- Fora: cartões de crédito, milhas e benefícios de cartão.

## Stack

Next.js (App Router) + TypeScript estrito + Tailwind · Supabase (Postgres, Auth, RLS) ·
TMDB (catálogo, só pelo servidor) · Resend (e-mail) · Web Push (VAPID) · Vercel (hospedagem e cron) · Vitest.

## Comandos

- `npm run dev` — servidor local (no PowerShell desta máquina, use `npm.cmd run dev`: a política de
  execução bloqueia o `npm.ps1`)
- `npm run check` — lint + typecheck + testes (rodar antes de todo commit)
- `npm run format` — Prettier

## Regras de segurança (não negociáveis)

- Nunca pedir, guardar ou registrar senha, login ou cartão de nenhum streaming. O app só envia links.
- Toda tabela tem Row Level Security ligado; cada linha pertence a `auth.uid()`.
- Chaves do TMDB, Resend, VAPID privada e service role do Supabase só no servidor
  (sem prefixo `NEXT_PUBLIC_`). Segredos só em `.env.local` / variáveis da Vercel.
- Toda entrada de usuário validada com Zod no servidor.
- Rotas de cron exigem o cabeçalho `Authorization: Bearer $CRON_SECRET`.
- LGPD: consentimento explícito, exportar e apagar conta.

## Organização

- `src/lib/rotation/` — motor do rodízio. Funções puras, sem I/O, 100% testadas. Valores em centavos (inteiros).
- `src/lib/catalog/` — catálogo fixo: `services.ts` (serviços, nível do plano, preços) e `bundles.ts`
  (pacotes e o que incluem). Preços com fonte; confirmar nos sites oficiais antes do lançamento.
- `src/lib/overlaps/` — detector de sobreposições: pago em dobro, opção com anúncios, pacote mais barato.
  Um pacote só cobre um serviço se o nível incluído for igual ou melhor (`TIER_RANK`).
- `src/lib/payoff/` — calculadora "se paga?": valor de cada assinatura pelo uso (cashback de corrida,
  entrega, frete, streaming incluído) contra o preço; recomenda assinar, cancelar ou trocar
  (uma por grupo). Regras de valor em `rules.ts`.
- `src/lib/actions.ts` — transforma o resultado do motor numa lista única de ações (cancelar, revezar,
  trocar, assinar, opções) com a economia anual; o total da tela vem daqui.
- `src/components/` — a interface: fluxo em 3 passos (`revezo-app.tsx`), cores por serviço
  (`service-style.tsx`, variáveis `--svc-*` em `globals.css`), tema claro/escuro (`theme-toggle.tsx`).
  Identidade visual igual à landing: índigo `--accent`, Bricolage Grotesque + Inter + JetBrains Mono.
- `src/lib/optimize.ts` — junta tudo: cancela o que é pago em dobro, tira do rodízio o que os pacotes cobrem,
  reveza o resto. Trocas que pioram o plano só são sugeridas, nunca aplicadas.

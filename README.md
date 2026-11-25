# Revezo

**Pague só pelas assinaturas que se pagam.**

Web app (PWA) que olha o que a pessoa assina, como ela usa e o que quer ver, e diz o que cancelar,
o que trocar e o que assinar:

- **Pago em dobro:** serviço avulso que um pacote dela já inclui (ex.: Disney+ avulso + Meli+ Total).
- **Assinaturas que se pagam:** Uber One, Clube iFood, Meli+, Amazon Prime… só quando a conta fecha com o uso dela.
- **Rodízio de streaming:** um serviço por mês, no mês da estreia, com pausa quando não há nada para ver.
- **Avisos** (em construção): quando assinar, cancelar, antes de renovar e quando um preço muda.

Público: Brasil. Cartões de crédito e milhas estão fora do escopo.

## Rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 22 ou mais novo.

```powershell
npm install
npm run dev
```

Abra http://localhost:3000. No PowerShell do Windows, se aparecer "running scripts is disabled",
use `npm.cmd install` e `npm.cmd run dev`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor local |
| `npm run check` | Lint + checagem de tipos + testes (rode antes de cada commit) |
| `npm test` | Só os testes |
| `npm run format` | Formata o código (Prettier) |

## Onde está cada coisa

| Pasta | O que tem |
| --- | --- |
| `src/lib/catalog/` | Serviços, pacotes e preços de referência (2026, a confirmar) |
| `src/lib/rotation/` | Motor do rodízio de streaming |
| `src/lib/overlaps/` | Detector de "pago em dobro" e "pacote mais barato" |
| `src/lib/payoff/` | Calculadora "essa assinatura se paga?" |
| `src/lib/optimize.ts` | Junta tudo num resultado só |
| `src/app/` | A tela (por enquanto, uma demonstração interativa do motor) |

Regras do projeto, decisões e próximos passos: [CLAUDE.md](CLAUDE.md).

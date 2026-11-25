import { Suspense } from "react";
import { Demo } from "./demo";

/** Tela provisória: demonstra o motor (sobreposições + rodízio). Será trocada pelo onboarding na etapa 3. */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Revezo · demonstração do motor
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Pague só pelas assinaturas que se pagam
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-400">
        Marque o que você paga hoje e como usa. O Revezo mostra o que está em dobro, quais
        assinaturas se pagam com o seu uso e monta o rodízio dos streamings. Preços de referência de
        2026, a confirmar; ajuste para os seus.
      </p>
      {/* A demo lê a data de hoje: com Suspense, ela é montada na visita, não no pré-render. */}
      <Suspense fallback={<p className="mt-8 text-neutral-500">Carregando a demonstração…</p>}>
        <Demo />
      </Suspense>
    </main>
  );
}

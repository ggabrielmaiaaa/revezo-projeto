import { Suspense } from "react";
import { RevezoApp } from "@/components/revezo-app";

export default function Home() {
  return (
    // O app lê a data de hoje: com Suspense, ele é montado na visita, não no pré-render.
    <Suspense
      fallback={
        <p className="grid min-h-screen place-items-center font-display text-xl text-muted">
          Carregando o Revezo…
        </p>
      }
    >
      <RevezoApp />
    </Suspense>
  );
}

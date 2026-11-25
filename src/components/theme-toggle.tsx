"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.classList.contains("dark");

/** Sol = claro, lua = escuro. A escolha fica salva no navegador. */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const set = (next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("revezo-theme", next ? "dark" : "light");
    } catch {
      // Armazenamento bloqueado: vale só nesta visita.
    }
  };

  const base =
    "grid size-9 place-items-center rounded-full transition-colors hover:text-ink aria-pressed:bg-accent-soft aria-pressed:text-accent";
  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex gap-0.5 rounded-full border border-line p-0.5 text-muted"
    >
      <button
        type="button"
        className={base}
        aria-pressed={!dark}
        aria-label="Tema claro"
        onClick={() => set(false)}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>
      <button
        type="button"
        className={base}
        aria-pressed={dark}
        aria-label="Tema escuro"
        onClick={() => set(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}

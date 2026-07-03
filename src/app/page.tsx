"use client";

import { MessageForm } from "@/app/components/forms/MessageForm";
import { ErrorBoundary } from "@/app/components/ui/ErrorBoundary";
import { RoleManager } from "@/components/RoleManager";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {}
      <div
        style={{
          position:       "relative",
          display:        "flex",
          justifyContent: "flex-end",
          alignItems:     "center",
          padding:        "10px 20px",
          background:     "var(--color-forest, #1b3a2b)",
          borderBottom:   "1px solid rgba(255,255,255,0.08)",
          zIndex:         40,
        }}
      >
        <RoleManager />
      </div>

      {}
      <ErrorBoundary>
        <MessageForm />
      </ErrorBoundary>
    </main>
  );
}

// Building blocks for the client area's pages (the frame is (area)/layout.tsx).
import { cn } from "@/lib/utils"

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border-2 border-ink bg-card p-5 shadow-[4px_4px_0_var(--ink)] sm:p-6", className)}>
      {children}
    </div>
  )
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        "mb-6 rounded-md border-2 px-4 py-3 text-sm font-semibold",
        tone === "ok" ? "border-success bg-success/10 text-success" : "border-danger bg-danger/10 text-danger",
      )}
    >
      {children}
    </p>
  )
}

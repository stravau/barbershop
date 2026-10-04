"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { hasNavigatedInApp } from "@/components/TopLoader"
import { cn } from "@/lib/utils"

/**
 * "← Voltar". Goes back in the browser history when the visitor got here
 * from another page of the site; otherwise (opened from a link, a reload)
 * it goes to `href`. With `fixed`, always goes to `href` (e.g. a step of a
 * sign-in flow). Before hydration it's a plain link to `href`.
 */
export function BackLink({
  href,
  label = "Voltar",
  fixed = false,
  className,
}: {
  href: string
  label?: string
  fixed?: boolean
  className?: string
}) {
  const router = useRouter()
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (fixed || !hasNavigatedInApp() || e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        router.back()
      }}
      className={cn(
        "mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-ink",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  )
}

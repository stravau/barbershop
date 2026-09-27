import { cn } from "@/lib/utils"

/**
 * Type-only version of the logo ("TARZAN'S" slab + "Barbershop" script).
 * The illustrated logo turns to mush at small sizes, so this is what the
 * header, footer and other small placements use. Scale it with font-size.
 */
export function Wordmark({
  className,
  tone = "ink",
}: {
  className?: string
  tone?: "ink" | "inverted"
}) {
  return (
    <span className={cn("inline-flex flex-col items-start leading-none", className)}>
      <span
        className={cn(
          "font-display",
          tone === "ink" ? "text-ink" : "text-yellow",
        )}
      >
        TARZAN&apos;S
      </span>
      <span
        className={cn(
          "font-script text-[0.8em] -mt-[0.28em] ml-[1.6em] -rotate-3",
          tone === "ink" ? "text-jungle" : "text-paper",
        )}
      >
        Barbershop
      </span>
    </span>
  )
}

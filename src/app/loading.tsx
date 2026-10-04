/** Shown in the middle of the page while the next page loads (any route). */
export default function Loading() {
  return (
    <div role="status" className="grid min-h-[65vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <span className="h-14 w-14 animate-spin rounded-full border-[5px] border-ink/10 border-t-ink border-r-yellow motion-reduce:animate-[spin_3s_linear_infinite]" />
        <span className="caps text-xs text-muted">A carregar…</span>
      </div>
    </div>
  )
}

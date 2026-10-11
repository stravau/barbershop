/** While a tab's content loads (the greeting and tabs stay on screen). */
export default function ContaLoading() {
  return (
    <div role="status" aria-label="A carregar" className="animate-pulse space-y-8 motion-reduce:animate-none">
      <div className="h-56 rounded-lg border-2 border-ink/15 bg-paper-dark/60" />
      <div className="h-40 rounded-lg border-2 border-ink/15 bg-paper-dark/60" />
    </div>
  )
}

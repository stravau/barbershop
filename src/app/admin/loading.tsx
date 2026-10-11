/** While an admin page loads (the tabs stay in the header): title and blocks. */
export default function AdminLoading() {
  return (
    <main role="status" aria-label="A carregar" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <span className="bone block h-9 w-56" />
      <span className="bone mt-3 block h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-64 rounded-lg border-2 border-ink/20 bg-card p-5">
          <span className="bone block h-5 w-1/3" />
          <span className="bone mt-4 block h-4 w-3/4" />
          <span className="bone mt-2 block h-4 w-2/3" />
        </div>
        <div className="h-64 rounded-lg border-2 border-ink/20 bg-card p-5">
          <span className="bone block h-5 w-1/3" />
          <span className="bone mt-4 block h-4 w-3/4" />
          <span className="bone mt-2 block h-4 w-2/3" />
        </div>
      </div>
    </main>
  )
}

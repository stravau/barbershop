import Link from "next/link"

export default function NotFound() {
  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="font-display print-shadow text-[clamp(5.5rem,22vw,10rem)] leading-none">
          404
        </p>
        <h1 className="mt-6 text-3xl sm:text-4xl">Página não encontrada</h1>
        <p className="mt-4 max-w-md text-lg text-ink/80">
          O endereço pode estar errado ou a página já não existe.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/" className="btn-ghost">
            Voltar ao início
          </Link>
          <Link href="/marcar" className="btn">
            Marcar corte
          </Link>
        </div>
      </div>
    </main>
  )
}

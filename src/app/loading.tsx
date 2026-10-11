/**
 * While a page loads (the home page on a first visit, and other pages
 * without their own loading state): a skeleton in the shape of the home
 * hero, on the same rays, so the real page drops into place.
 */
export default function Loading() {
  const block = "rounded-md bg-ink/10"
  return (
    <div
      role="status"
      aria-label="A carregar"
      className="relative isolate flex min-h-[calc(100svh-62px)] items-center overflow-hidden sm:min-h-[calc(100svh-70px)]"
    >
      <div
        aria-hidden="true"
        className="sunburst pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[max(150vw,150vh)] -translate-x-1/2 -translate-y-1/2"
      />
      <div className="mx-auto grid w-full max-w-6xl animate-pulse items-center gap-14 px-4 py-10 motion-reduce:animate-none sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-16">
        <div className="flex flex-col items-center">
          {/* TARZAN'S / Barbershop */}
          <div className={`${block} h-[clamp(3rem,10vw,6.5rem)] w-full max-w-[640px]`} />
          <div className={`${block} mt-4 h-[clamp(2rem,6vw,4rem)] w-2/3 max-w-[380px]`} />
          {/* Tagline and description */}
          <div className={`${block} mt-9 h-8 w-5/6 max-w-[440px]`} />
          <div className={`${block} mt-5 h-4 w-11/12 max-w-[420px]`} />
          <div className={`${block} mt-2.5 h-4 w-2/3 max-w-[300px]`} />
          {/* Button, next-slot ticket, link */}
          <div className="mt-9 w-full max-w-[440px]">
            <div className="h-14 rounded-md border-2 border-ink/15 bg-ink/10" />
            <div className="mt-3 h-[68px] rounded-md border-2 border-ink/15 bg-ink/10 md:hidden" />
            <div className={`${block} mx-auto mt-4 h-4 w-24`} />
          </div>
        </div>
        {/* From md up: the phone with the videos */}
        <div className="mx-auto hidden aspect-[9/19] w-[min(280px,calc((100svh-210px)*0.5))] min-w-[230px] rounded-[2.5rem] border-[10px] border-ink/10 bg-ink/5 md:block" />
      </div>
    </div>
  )
}

"use client"

import { usePathname } from "next/navigation"
import { BookingsTabSkeleton, DetailsTabSkeleton, ExpressTabSkeleton } from "../_components/Skeletons"

/** While a tab's content loads (greeting and tabs stay): that tab's shape. */
export default function ContaLoading() {
  const pathname = usePathname()
  return (
    <div role="status" aria-label="A carregar">
      {pathname.startsWith("/conta/marcacoes") ? (
        <BookingsTabSkeleton />
      ) : pathname.startsWith("/conta/dados") ? (
        <DetailsTabSkeleton />
      ) : (
        <ExpressTabSkeleton />
      )}
    </div>
  )
}

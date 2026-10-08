// The Instagram videos shown on the home page (files in public/videos:
// H.264 mp4 + a cover frame each). To change them, replace the files and
// this list — order here is the order they play in.

export interface Reel {
  id: string
  src: string
  poster: string
  /** What the video shows, for screen readers */
  label: string
}

export const REELS: readonly Reel[] = [
  {
    id: "transformacoes",
    src: "/videos/transformacoes.mp4",
    poster: "/videos/transformacoes.jpg",
    label: "Transformações: cabelo comprido para um corte com degradê",
  },
  {
    id: "locked-in",
    src: "/videos/locked-in.mp4",
    poster: "/videos/locked-in.jpg",
    label: "Locked in: cortes com degradê, antes e depois",
  },
  {
    id: "ao-domicilio",
    src: "/videos/ao-domicilio.mp4",
    poster: "/videos/ao-domicilio.jpg",
    label: "O barbeiro vai a casa: degradê feito na sala do cliente",
  },
  {
    id: "mudanca",
    src: "/videos/mudanca.mp4",
    poster: "/videos/mudanca.jpg",
    label: "Precisava de uma mudança: antes e depois do corte",
  },
]

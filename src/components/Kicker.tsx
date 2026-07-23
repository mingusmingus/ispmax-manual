import type { ReactNode } from 'react';

/** Etiqueta de sección sobre el título (`.section-kicker` del original). */
export default function Kicker({ children }: { children?: ReactNode }) {
  return <p className="isp-kicker">{children}</p>;
}

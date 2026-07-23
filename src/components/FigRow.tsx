import type { ReactNode } from 'react';

/** Fila de figuras que comparten línea (`.fig-row` del original). */
export default function FigRow({ children }: { children?: ReactNode }) {
  return <div className="isp-fig-row">{children}</div>;
}

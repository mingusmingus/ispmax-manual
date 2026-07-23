import type { ReactNode } from 'react';

/** Rejilla de figuras a dos columnas (`.fig-grid` del original). */
export default function FigGrid({ children }: { children?: ReactNode }) {
  return <div className="isp-fig-grid">{children}</div>;
}

import type { CSSProperties, ReactNode } from 'react';

export interface CardsProps {
  children?: ReactNode;
  /** Columnas en escritorio (1, 2 o 3). En móvil siempre es 1. */
  columns?: number;
}

/** Rejilla de tarjetas — equivale a `.grid-2` / `.grid-3` del manual original. */
export default function Cards({ children, columns = 3 }: CardsProps) {
  return (
    <div
      className="isp-cards"
      style={{ '--isp-cards-columns': String(columns) } as CSSProperties}
    >
      {children}
    </div>
  );
}

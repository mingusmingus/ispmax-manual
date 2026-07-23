import type { ReactNode } from 'react';

/** Párrafo de entradilla (`.section-desc` del original). */
export default function Lead({ children }: { children?: ReactNode }) {
  return <p className="isp-lead">{children}</p>;
}

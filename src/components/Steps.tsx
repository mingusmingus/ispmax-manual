import type { ReactNode } from 'react';

/**
 * Lista de pasos numerada. Reproduce `.steps` del manual original con el
 * mismo lenguaje visual que el componente `Steps` nativo de Rspress, pero sin
 * exigir encabezados (nuestros pasos son párrafos con capturas).
 */
export default function Steps({ children }: { children?: ReactNode }) {
  return <div className="isp-steps">{children}</div>;
}

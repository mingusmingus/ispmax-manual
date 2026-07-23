import type { ReactNode } from 'react';

/** Un paso dentro de `<Steps>`. La numeración la pone el CSS (counter). */
export default function Step({ children }: { children?: ReactNode }) {
  return <div className="isp-step">{children}</div>;
}

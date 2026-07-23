import type { CSSProperties } from 'react';

export interface FigureProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  /** Ancho máximo del recorte, tal y como venía en el HTML original. */
  max?: string;
  /** `compact`, `start`, `hero` — variantes heredadas del manual original. */
  variant?: string;
  /** Imagen suelta dentro de un párrafo (sin `<figure>`). */
  inline?: boolean;
}

/**
 * Captura de pantalla del manual. Mantiene proporción, hace lazy-load y se
 * integra con el zoom nativo de Rspress (medium-zoom).
 */
export default function Figure({
  src,
  alt = '',
  caption,
  width,
  height,
  max,
  variant = '',
  inline = false,
}: FigureProps) {
  const img = (
    <img
      className="isp-figure__img"
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );

  if (inline) return img;

  const classes = ['isp-figure', ...variant.split(/\s+/).filter(Boolean).map(v => `isp-figure--${v}`)];
  const style = max ? ({ '--isp-figure-max': max } as CSSProperties) : undefined;

  return (
    <figure className={classes.join(' ')} style={style}>
      <div className="isp-figure__frame">{img}</div>
      {caption ? <figcaption className="isp-figure__caption">{caption}</figcaption> : null}
    </figure>
  );
}

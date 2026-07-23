import type { CSSProperties } from 'react';

export interface FigureProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  /** Ancho máximo del recorte (nunca por encima del tamaño real del archivo). */
  max?: string;
  /** `compact`, `start`, `hero` — variantes heredadas del manual original. */
  variant?: string;
  /** Imagen suelta dentro de un párrafo (sin `<figure>`). */
  inline?: boolean;
}

/**
 * Captura de pantalla del manual.
 *
 * Reglas de tamaño:
 *  · nunca se amplía por encima de su ancho natural (`width`);
 *  · si se indicó un `max`, se respeta como tope adicional;
 *  · conserva la proporción con `aspect-ratio` para no provocar saltos de
 *    maquetación mientras carga.
 *
 * Se integra con el zoom nativo de Rspress (medium-zoom).
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

  const variants = variant.split(/\s+/).filter(Boolean);
  const classes = ['isp-figure', ...variants.map(v => `isp-figure--${v}`)];

  // Tope de ancho: el menor entre `max` y el ancho real. Nunca amplía.
  const caps: string[] = [];
  if (width) caps.push(`${width}px`);
  if (max) caps.push(max);
  const maxWidth = caps.length ? (caps.length === 1 ? caps[0] : `min(${caps.join(', ')})`) : undefined;

  const style: CSSProperties = {};
  if (maxWidth) style['--isp-figure-max' as string] = maxWidth;
  if (width && height) style['--isp-figure-ratio' as string] = `${width} / ${height}`;

  return (
    <figure className={classes.join(' ')} style={style}>
      <div className="isp-figure__frame">{img}</div>
      {caption ? <figcaption className="isp-figure__caption">{caption}</figcaption> : null}
    </figure>
  );
}

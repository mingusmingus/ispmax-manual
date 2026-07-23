import { Link } from '@rspress/core/theme';
import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  icon?: string;
  href?: string;
  children?: ReactNode;
}

/** Tarjeta informativa — equivale a `.info-card` / `.hero-card` del original. */
export default function Card({ title, icon, href, children }: CardProps) {
  const body = (
    <>
      {icon ? (
        <span className="isp-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {title ? <span className="isp-card__title">{title}</span> : null}
      <div className="isp-card__body">{children}</div>
    </>
  );

  if (href) {
    return (
      <Link className="isp-card isp-card--link" href={href}>
        {body}
      </Link>
    );
  }

  return <div className="isp-card">{body}</div>;
}

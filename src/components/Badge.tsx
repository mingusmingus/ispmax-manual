import { Badge as RspressBadge, type BadgeProps } from '@rspress/core/theme';

/**
 * Reexporta el `Badge` nativo de Rspress como componente global, para que los
 * MDX puedan usar `<Badge type="tip">Activo</Badge>` sin importarlo.
 *
 * Equivalencias con las clases del manual original:
 *   `.badge.green` → `tip`   ·  `.badge.red`    → `danger`
 *   `.badge.yellow`→ `warning`· `.badge.blue`   → `info`
 *   `.badge.gray`  → `info outline`
 */
export default function Badge(props: BadgeProps) {
  return <RspressBadge {...props} />;
}

import { Callout as RspressCallout, type CalloutProps } from '@rspress/core/theme';

/**
 * Reexporta el `Callout` nativo como componente global.
 *
 * Se usa cuando un aviso va anidado dentro de otro contenedor (por ejemplo un
 * `:::details`): la sintaxis `:::` no se puede anidar, pero el componente sí.
 */
export default function Callout(props: CalloutProps) {
  return <RspressCallout {...props} />;
}

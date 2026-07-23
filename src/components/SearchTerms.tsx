/**
 * Conserva los términos de `data-search` que traía cada `<section>` del HTML
 * original. Se renderizan ocultos a la vista pero siguen siendo accesibles
 * para el buscador del navegador (Ctrl+F) y para lectores de pantalla.
 */
export default function SearchTerms({ terms }: { terms?: string }) {
  if (!terms) return null;
  return (
    <p className="isp-sr-only">
      Palabras clave: {terms.split(/\s+/).filter(Boolean).join(', ')}.
    </p>
  );
}

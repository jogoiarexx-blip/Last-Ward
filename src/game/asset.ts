/** Resolve arquivos de public/ respeitando o subdiretório do GitHub Pages. */
export function asset(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${clean}`;
}

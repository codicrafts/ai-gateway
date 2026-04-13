export function buildModelDetailHref(modelId: string): string {
  return `/models/${encodeURIComponent(modelId)}`;
}

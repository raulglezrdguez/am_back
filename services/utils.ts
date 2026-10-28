// Escapa caracteres especiales de regex para tratarlos como texto literal
export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

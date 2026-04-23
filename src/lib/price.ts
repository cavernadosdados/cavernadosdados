/**
 * Price helpers — preço é armazenado em centavos (BRL) na coluna `tables.price_cents`.
 * Quando 0, a mesa é considerada gratuita.
 */
export function formatPriceBRL(cents: number | null | undefined): string {
  if (!cents || cents <= 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function isFreeTable(cents: number | null | undefined): boolean {
  return !cents || cents <= 0;
}
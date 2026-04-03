const ringgitFormatter = new Intl.NumberFormat("ms-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return ringgitFormatter.format(amount).replace(/\u00A0/g, " ");
}

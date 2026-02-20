export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Future dates (negative diff) - handle gracefully or show absolute
  if (diffInSeconds < 0) return date.toLocaleDateString();

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const amountInputProps = {
  formatter: (value: number | string | undefined) =>
    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (displayValue: string | undefined) =>
    displayValue?.replace(/\$\s?|(,*)/g, "") as unknown as number,
};

/** Format a number with comma separators. Handles string/Decimal values from backend. */
export function fmtAmount(amount: number | string | null | undefined): string {
  if (amount == null) return "0";
  const num = Number(amount);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}

/** Format currency + amount with commas: "TZS 100,000" */
export function fmtCurrency(amount: number | string | null | undefined, currency: string = "TZS"): string {
  return `${currency} ${fmtAmount(amount)}`;
}

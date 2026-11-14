const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const money = (cents: number): string => USD.format(cents / 100);

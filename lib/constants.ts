export const CATEGORIES = [
  "Coffee",
  "Tea",
  "Pastry",
  "Cold Drinks",
  "Specials",
] as const;

export const CATEGORY_KEY_MAP: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
};

export const DEFAULT_TAX_RATE = 10;

export const ROLES = ["admin", "manager", "cashier"] as const;

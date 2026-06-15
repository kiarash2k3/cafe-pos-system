"use client";

import { Product } from "@/lib/types";
import { CATEGORIES, CATEGORY_KEY_MAP } from "@/lib/constants";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const addItem = useCartStore((s) => s.addItem);

  const filtered =
    selectedCategory === "All"
      ? products.filter((p) => p.is_active)
      : products.filter(
          (p) => p.is_active && p.category === selectedCategory
        );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const idx = CATEGORY_KEY_MAP[e.key];
      if (idx !== undefined) {
        setSelectedCategory(CATEGORIES[idx]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === "All" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("All")}
        >
          All
        </Button>
        {CATEGORIES.map((cat, idx) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            <span className="text-xs text-muted-foreground mr-1">
              {idx + 1}
            </span>
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((product) => (
          <button
            key={product.id}
            className="flex flex-col items-center justify-center p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-center gap-1 min-h-[100px]"
            onClick={() =>
              addItem({
                product_id: product.id,
                name: product.name,
                price: product.price,
                cost: product.cost,
              })
            }
          >
            <span className="font-medium text-sm">{product.name}</span>
            <span className="text-lg font-bold">
              ${product.price.toFixed(2)}
            </span>
            {product.stock_quantity <= product.low_stock_threshold && (
              <span className="text-xs text-destructive">Low stock</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

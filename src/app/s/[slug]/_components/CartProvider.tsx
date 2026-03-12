"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem, Product, ProductVariant } from "./types";

/** Unique key for a cart line: productId or productId::variantId */
function cartKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number, variant?: ProductVariant, overrideLabel?: string) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  slug,
  roasterId,
  children,
}: {
  slug: string;
  roasterId: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`cart-${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [slug]);

  // Sync to sessionStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    if (items.length > 0) {
      sessionStorage.setItem(
        `cart-${slug}`,
        JSON.stringify({ items, roasterId })
      );
    } else {
      sessionStorage.removeItem(`cart-${slug}`);
    }
  }, [items, slug, roasterId, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (product: Product, qty = 1, variant?: ProductVariant, overrideLabel?: string) => {
      const variantId = variant?.id ?? null;

      // Build variant label
      let variantLabel: string | null = null;
      if (overrideLabel) {
        variantLabel = overrideLabel;
      } else if (variant) {
        const parts: string[] = [];
        if (variant.weight_grams) {
          parts.push(
            variant.weight_grams >= 1000
              ? `${variant.weight_grams / 1000}kg`
              : `${variant.weight_grams}g`
          );
        }
        if (variant.grind_type) {
          parts.push(variant.grind_type.name);
        }
        // Fallback to variant.unit for "other" products (contains combo label e.g. "Medium / Blue")
        if (parts.length === 0 && variant.unit) {
          variantLabel = variant.unit;
        } else if (parts.length > 0) {
          variantLabel = parts.join(" / ");
        }
      }

      const price = variant?.retail_price ?? product.retail_price ?? product.price;
      const unit = variant?.unit ?? product.unit;
      const key = cartKey(product.id, variantId);

      setItems((prev) => {
        const existing = prev.find(
          (item) => cartKey(item.productId, item.variantId) === key
        );
        if (existing) {
          return prev.map((item) =>
            cartKey(item.productId, item.variantId) === key
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price,
            unit,
            quantity: qty,
            imageUrl: product.image_url,
            variantId,
            variantLabel,
          },
        ];
      });
      setIsOpen(true);
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      const key = cartKey(productId, variantId);
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((item) => cartKey(item.productId, item.variantId) !== key)
        );
      } else {
        setItems((prev) =>
          prev.map((item) =>
            cartKey(item.productId, item.variantId) === key
              ? { ...item, quantity }
              : item
          )
        );
      }
    },
    []
  );

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    const key = cartKey(productId, variantId);
    setItems((prev) => prev.filter((item) => cartKey(item.productId, item.variantId) !== key));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    sessionStorage.removeItem(`cart-${slug}`);
  }, [slug]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

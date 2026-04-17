"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStorefront } from "../../_components/StorefrontProvider";
import { Header } from "../../_components/Header";
import { Cart } from "../../_components/Cart";
import { Footer } from "../../_components/Footer";
import { Minus, Plus, Trash2 } from "@/components/icons";
import { Star } from "lucide-react";

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  free_threshold: number | null;
  estimated_days: string | null;
  max_weight_kg: number | null;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  minimum: number;
  weightGrams: number;
}

interface CheckoutData {
  roasterId: string;
  roasterSlug: string;
  roasterName: string;
  wholesaleAccessId: string;
  paymentTerms: string;
  items: OrderItem[];
  successUrl: string;
  cancelUrl: string;
  context: { type: string; slug?: string; domain?: string };
}

interface BuyerAddress {
  id: string;
  label: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  is_default: boolean;
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  net7: "Net 7 days",
  net14: "Net 14 days",
  net30: "Net 30 days",
};

function formatAddress(addr: BuyerAddress) {
  return [addr.address_line_1, addr.address_line_2, addr.city, addr.county, addr.postcode, addr.country]
    .filter(Boolean)
    .join(", ");
}

export default function WholesaleCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { accent, accentText } = useStorefront();

  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(true);

  // Load checkout data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("wholesale_checkout");
    if (!raw) {
      router.replace(`/s/${slug}/wholesale`);
      return;
    }
    try {
      const data: CheckoutData = JSON.parse(raw);
      if (!data.items?.length) {
        router.replace(`/s/${slug}/wholesale`);
        return;
      }
      setCheckout(data);
      setItems(data.items);
    } catch {
      router.replace(`/s/${slug}/wholesale`);
    }
  }, [slug, router]);

  // Fetch buyer addresses
  useEffect(() => {
    if (!checkout) return;

    async function loadAddresses() {
      try {
        const res = await fetch(`/api/s/buyer-addresses?roasterId=${checkout!.roasterId}`);
        if (res.ok) {
          const data = await res.json();
          const addrs: BuyerAddress[] = data.addresses || [];
          setAddresses(addrs);
          // Pre-select default
          const defaultAddr = addrs.find((a) => a.is_default);
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          else if (addrs.length === 1) setSelectedAddressId(addrs[0].id);
        }
      } finally {
        setAddressLoading(false);
      }
    }

    loadAddresses();
  }, [checkout]);

  // Fetch shipping methods for this roaster
  useEffect(() => {
    if (!checkout) return;

    async function loadShipping() {
      try {
        const res = await fetch(`/api/s/shipping-methods?roasterId=${checkout!.roasterId}`);
        if (res.ok) {
          const data = await res.json();
          setShippingMethods(data.methods || []);
        }
      } finally {
        setShippingLoading(false);
      }
    }

    loadShipping();
  }, [checkout]);

  function updateQuantity(itemKey: string, quantity: number) {
    const item = items.find((i) => i.productId === itemKey);
    if (!item) return;
    if (quantity < item.minimum) {
      setItems((prev) => prev.filter((i) => i.productId !== itemKey));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === itemKey ? { ...i, quantity } : i))
    );
  }

  function removeItem(itemKey: string) {
    setItems((prev) => prev.filter((i) => i.productId !== itemKey));
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  // Calculate total order weight in kg
  const totalWeightKg = items.reduce(
    (sum, item) => sum + (item.weightGrams / 1000) * item.quantity,
    0
  );

  // Filter shipping methods by weight limit
  const availableMethods = shippingMethods.filter(
    (m) => m.max_weight_kg === null || m.max_weight_kg >= totalWeightKg
  );

  // Get selected shipping method and calculate cost
  const selectedShipping = availableMethods.find((m) => m.id === selectedShippingId) || null;
  const shippingCost = selectedShipping
    ? selectedShipping.free_threshold && subtotal >= selectedShipping.free_threshold
      ? 0
      : selectedShipping.price
    : 0;
  const orderTotal = subtotal + shippingCost;

  const hasShippingOptions = shippingMethods.length > 0;
  const canPlaceOrder = items.length > 0 && selectedAddress !== null && (!hasShippingOptions || selectedShippingId !== null);

  async function handlePlaceOrder() {
    if (!checkout || !canPlaceOrder || !selectedAddress) return;
    setSubmitting(true);
    setError(null);

    try {
      const endpoint = "/api/s/invoice-checkout";

      const deliveryAddress = {
        label: selectedAddress.label || undefined,
        address_line_1: selectedAddress.address_line_1,
        address_line_2: selectedAddress.address_line_2 || undefined,
        city: selectedAddress.city,
        county: selectedAddress.county || undefined,
        postcode: selectedAddress.postcode,
        country: selectedAddress.country,
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roasterId: checkout.roasterId,
          items: items.map((item) => ({
            productId: item.productId.split(":")[0],
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          wholesaleAccessId: checkout.wholesaleAccessId,
          slug: checkout.roasterSlug,
          successUrl: checkout.successUrl,
          cancelUrl: checkout.cancelUrl,
          deliveryAddress,
          orderNotes: notes || undefined,
          ...(selectedShippingId ? { shippingMethodId: selectedShippingId, shippingCost } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to place order.");
        return;
      }

      const data = await res.json();

      // Clear cart from sessionStorage
      sessionStorage.removeItem("wholesale_checkout");

      // Store order details for success page
      sessionStorage.setItem("wholesale_order_details", JSON.stringify({
        deliveryAddress,
        notes: notes || null,
      }));

      if (data.success) {
        const urlParams = new URLSearchParams({
          invoice_id: data.invoiceId || "",
          invoice_number: data.invoiceNumber || "",
          order_id: data.orderId || "",
          ...(data.accessToken ? { access_token: data.accessToken } : {}),
        });
        window.location.href = `${checkout.successUrl}?${urlParams.toString()}`;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!checkout) {
    return (
      <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
        <Header />
        <Cart />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-slate-500">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
        <Header />
        <Cart />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-slate-600 mb-4">Your order is empty.</p>
          <Link
            href={`/s/${slug}/wholesale`}
            className="inline-flex items-center px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: accentText }}
          >
            Back to Catalogue
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--sf-font)" }} className="min-h-screen">
      <Header />
      <Cart />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--sf-text)" }}>
            Review Order
          </h1>
          <Link
            href={`/s/${slug}/wholesale`}
            className="text-sm hover:underline"
            style={{ color: accent }}
          >
            Back to Catalogue
          </Link>
        </div>

        {/* ─── Order Summary ─── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Order Summary
          </h2>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {`\u00a3${item.price.toFixed(2)} / ${item.unit}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                  >
                    <Minus className="w-3 h-3 text-slate-500" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                  </button>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="ml-1 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-900 w-20 text-right shrink-0">
                  {`\u00a3${(item.price * item.quantity).toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-200 mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">
                {`${orderCount} item${orderCount !== 1 ? "s" : ""}`}
              </span>
              <div className="text-right">
                <span className="text-sm text-slate-500 mr-3">Subtotal</span>
                <span className="text-sm font-semibold text-slate-900">
                  {`\u00a3${subtotal.toFixed(2)}`}
                </span>
              </div>
            </div>
            {selectedShipping && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Shipping</span>
                <span className="text-sm font-semibold text-slate-900">
                  {shippingCost === 0 ? "Free" : `\u00a3${shippingCost.toFixed(2)}`}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-lg font-bold" style={{ color: "var(--sf-text)" }}>
                {`\u00a3${orderTotal.toFixed(2)}`}
              </span>
            </div>
          </div>
        </section>

        {/* ─── Delivery Address ─── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Delivery Address
          </h2>

          {addressLoading ? (
            <p className="text-sm text-slate-400">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <div className="text-sm text-slate-600">
              <p className="mb-2">No delivery addresses saved.</p>
              <Link
                href={`/s/${slug}/account`}
                className="font-medium hover:underline"
                style={{ color: accent }}
              >
                Add an address in Account Settings
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAddressId === addr.id
                      ? "border-slate-400 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryAddress"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {addr.label && (
                        <span className="text-sm font-medium text-slate-900">{addr.label}</span>
                      )}
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{formatAddress(addr)}</p>
                  </div>
                </label>
              ))}
              <Link
                href={`/s/${slug}/account`}
                className="inline-block text-xs mt-1 hover:underline"
                style={{ color: accent }}
              >
                Manage addresses
              </Link>
            </div>
          )}
        </section>

        {/* ─── Shipping Method ─── */}
        {shippingLoading ? (
          <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Shipping
            </h2>
            <p className="text-sm text-slate-400">Loading shipping options...</p>
          </section>
        ) : hasShippingOptions ? (
          <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Shipping
            </h2>
            {availableMethods.length === 0 ? (
              <p className="text-sm text-slate-500">
                No shipping methods available for this order weight ({totalWeightKg.toFixed(1)}kg).
                Please contact the roaster.
              </p>
            ) : (
              <div className="space-y-2">
                {availableMethods.map((method) => {
                  const isFree = method.free_threshold !== null && subtotal >= method.free_threshold;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedShippingId === method.id
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={selectedShippingId === method.id}
                        onChange={() => setSelectedShippingId(method.id)}
                        className="mt-0.5 accent-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{method.name}</span>
                          {method.estimated_days && (
                            <span className="text-xs text-slate-400">
                              ({method.estimated_days})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isFree ? (
                            <>
                              <span className="text-sm font-semibold text-green-600">Free</span>
                              <span className="text-xs text-slate-400 line-through">
                                {`\u00a3${method.price.toFixed(2)}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-slate-700">
                                {`\u00a3${method.price.toFixed(2)}`}
                              </span>
                              {method.free_threshold && (
                                <span className="text-xs text-slate-400">
                                  {`Free over \u00a3${method.free_threshold.toFixed(2)}`}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {/* ─── Order Notes ─── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Order Notes
            <span className="text-xs font-normal text-slate-400 ml-2">(optional)</span>
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery instructions, special requests, etc."
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </section>

        {/* ─── Payment ─── */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Payment
          </h2>
          <p className="text-sm text-slate-700 mb-1">
            {PAYMENT_TERMS_LABELS[checkout.paymentTerms] || checkout.paymentTerms}
          </p>
          <p className="text-xs text-slate-500">
            An invoice will be sent to your email with {checkout.paymentTerms.replace("net", "")} day payment terms.
          </p>
        </section>

        {/* ─── Error + Place Order ─── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link
            href={`/s/${slug}/wholesale`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Back to Catalogue
          </Link>
          <button
            onClick={handlePlaceOrder}
            disabled={!canPlaceOrder || submitting}
            style={canPlaceOrder && !submitting ? { backgroundColor: accent, color: accentText } : {}}
            className={`px-8 py-3 rounded-lg font-semibold text-sm transition-opacity ${
              canPlaceOrder && !submitting
                ? "hover:opacity-90"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            {submitting
              ? "Placing Order..."
              : `Place Order \u00b7 \u00a3${orderTotal.toFixed(2)}`}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

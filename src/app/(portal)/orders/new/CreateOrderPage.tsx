"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Package,
  User,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin";

// ── Interfaces ──

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  business_name?: string;
}

interface ProductVariant {
  id: string;
  weight_grams: number | null;
  unit: string | null;
  retail_price: number | null;
  wholesale_price: number | null;
  channel: string | null;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  retail_price: number | null;
  wholesale_price: number | null;
  is_retail: boolean;
  is_wholesale: boolean;
  status: string;
  product_variants: ProductVariant[];
}

interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

// ── Helpers ──

function formatPrice(pounds: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pounds);
}

function getVariantLabel(v: ProductVariant): string {
  const parts: string[] = [];
  if (v.unit) parts.push(v.unit);
  if (v.weight_grams) parts.push(`${v.weight_grams}g`);
  if (v.channel) parts.push(v.channel);
  return parts.join(" / ") || "Variant";
}

function getPrice(
  product: Product,
  variant: ProductVariant | null,
  channel: "wholesale" | "storefront"
): number {
  if (channel === "wholesale") {
    if (variant?.wholesale_price != null) return variant.wholesale_price;
    if (product.wholesale_price != null) return product.wholesale_price;
    return product.price || 0;
  }
  // storefront / retail
  if (variant?.retail_price != null) return variant.retail_price;
  if (product.retail_price != null) return product.retail_price;
  return product.price || 0;
}

// ── Component ──

interface CreateOrderPageProps {
  roasterId: string;
}

interface SenderContact {
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  business_id: string | null;
  business_name: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ExtractionData {
  customer: { name: string | null; email: string | null; business_name: string | null; matched_contact_id: string | null };
  items: { product_name: string; matched_product_id: string | null; variant_description: string | null; matched_variant_id: string | null; quantity: number; notes: string | null }[];
  delivery_notes: string | null;
  order_channel: "wholesale" | "retail";
  confidence: "high" | "medium" | "low";
  raw_notes: string | null;
  inboxMessageId: string;
  fromEmail?: string;
  fromName?: string;
  subject?: string;
  manual?: boolean;
  senderContact?: SenderContact;
}

// ── Email Panel ──

interface EmailPanelMessage {
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  attachments?: { filename: string; content_type: string; size: number; url: string }[];
}

function EmailPanel({
  messageId,
  isOpen,
  onToggle,
}: {
  messageId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [email, setEmail] = useState<EmailPanelMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inbox/${messageId}`)
      .then((r) => r.json())
      .then(setEmail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [messageId]);

  return (
    <>
      {/* Collapsible email panel */}
      <div
        className={cn(
          "shrink-0 border-r border-slate-200 bg-white overflow-hidden transition-all duration-200",
          isOpen ? "w-full lg:w-[480px]" : "w-0"
        )}
      >
        <div className="w-full lg:w-[480px] h-full overflow-y-auto">
          {/* Panel header */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              Source Email
            </h3>
            <button
              onClick={onToggle}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors lg:hidden"
              title="Hide email"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : email ? (
            <div className="p-4 space-y-4">
              {/* Email metadata */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-slate-500 w-14 shrink-0">From</span>
                  <span className="text-slate-900 font-medium">
                    {email.from_name
                      ? `${email.from_name} <${email.from_email}>`
                      : email.from_email}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-slate-500 w-14 shrink-0">Subject</span>
                  <span className="text-slate-700">
                    {email.subject || "(No subject)"}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-slate-500 w-14 shrink-0">Date</span>
                  <span className="text-slate-500">
                    {new Date(email.received_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50",
                        !att.url && "pointer-events-none opacity-50"
                      )}
                    >
                      <FileText className="w-3 h-3" />
                      {att.filename}
                    </a>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100" />

              {/* Email body */}
              {email.body_html ? (
                <div
                  className="prose prose-sm max-w-none prose-slate"
                  dangerouslySetInnerHTML={{ __html: email.body_html }}
                />
              ) : email.body_text ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {email.body_text}
                </pre>
              ) : (
                <p className="text-slate-400 text-sm italic">No content</p>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-sm text-slate-400">
              Failed to load email
            </div>
          )}
        </div>
      </div>

      {/* Toggle button (desktop only — between panels) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex shrink-0 w-6 items-center justify-center border-r border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        title={isOpen ? "Hide email" : "Show email"}
      >
        {isOpen ? (
          <PanelLeftClose className="w-4 h-4" />
        ) : (
          <PanelLeftOpen className="w-4 h-4" />
        )}
      </button>
    </>
  );
}

export function CreateOrderPage({ roasterId }: CreateOrderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Form state ──
  const [orderChannel, setOrderChannel] = useState<"wholesale" | "storefront">(
    "wholesale"
  );
  const [customerMode, setCustomerMode] = useState<"search" | "manual">(
    "search"
  );
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerBusiness, setCustomerBusiness] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
    label: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("invoice");
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inboxMessageId, setInboxMessageId] = useState<string | null>(null);
  const [extractionBanner, setExtractionBanner] = useState<{
    confidence: string;
    unmatchedItems: string[];
    subject?: string;
  } | null>(null);

  // ── Email panel state ──
  const emailMessageId = searchParams.get("messageId");
  const [emailPanelOpen, setEmailPanelOpen] = useState(true);

  // ── Contact search state ──
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactSearchRef = useRef<HTMLDivElement>(null);
  const contactDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product search state ──
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // ── Contact search (debounced) ──
  useEffect(() => {
    if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current);
    if (!contactSearch.trim()) {
      setContactResults([]);
      setShowContactDropdown(false);
      return;
    }
    contactDebounceRef.current = setTimeout(async () => {
      setIsSearchingContacts(true);
      try {
        const res = await fetch(
          `/api/contacts?search=${encodeURIComponent(contactSearch)}&status=all&page=1`
        );
        const data = await res.json();
        setContactResults(data.contacts || []);
        setShowContactDropdown(true);
      } catch {
        setContactResults([]);
      } finally {
        setIsSearchingContacts(false);
      }
    }, 300);
    return () => {
      if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current);
    };
  }, [contactSearch]);

  // ── Product fetch ──
  const fetchProducts = useCallback(async (search: string) => {
    setIsSearchingProducts(true);
    try {
      const res = await fetch(`/api/products`);
      const data = await res.json();
      let products: Product[] = data.products || [];
      // Client-side filter since the products API doesn't have a search param
      if (search.trim()) {
        const term = search.toLowerCase();
        products = products.filter((p: Product) =>
          p.name.toLowerCase().includes(term)
        );
      }
      // Only show published products
      products = products.filter((p: Product) => p.status === "published");
      // Filter by channel — wholesale orders show is_wholesale products, storefront shows is_retail
      products = products.filter((p: Product) =>
        orderChannel === "wholesale" ? p.is_wholesale : p.is_retail
      );
      setProductResults(products);
    } catch {
      setProductResults([]);
    } finally {
      setIsSearchingProducts(false);
    }
  }, [orderChannel]);

  useEffect(() => {
    if (showProductSearch) {
      fetchProducts(productSearch);
    }
  }, [showProductSearch, productSearch, fetchProducts]);

  // ── Click outside handlers ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        contactSearchRef.current &&
        !contactSearchRef.current.contains(e.target as Node)
      ) {
        setShowContactDropdown(false);
      }
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(e.target as Node)
      ) {
        setShowProductSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Pre-populate from inbox extraction ──
  useEffect(() => {
    if (searchParams.get("from") !== "inbox") return;
    const raw = sessionStorage.getItem("inbox_order_extraction");
    if (!raw) return;

    try {
      const ext: ExtractionData = JSON.parse(raw);
      sessionStorage.removeItem("inbox_order_extraction");

      // Set inbox message ID for marking as converted after order creation
      setInboxMessageId(ext.inboxMessageId);

      // Manual conversion — pre-fill from matched sender contact or raw sender info
      if (ext.manual) {
        if (ext.senderContact) {
          // Sender email matched an existing contact — auto-select them
          setSelectedContact({
            id: ext.senderContact.contact_id,
            first_name: ext.senderContact.first_name,
            last_name: ext.senderContact.last_name,
            email: ext.senderContact.email,
            phone: ext.senderContact.phone || undefined,
            business_name: ext.senderContact.business_name || undefined,
          });
          setCustomerName(`${ext.senderContact.first_name} ${ext.senderContact.last_name}`.trim());
          setCustomerEmail(ext.senderContact.email || "");
          setCustomerBusiness(ext.senderContact.business_name || "");
          setCustomerPhone(ext.senderContact.phone || "");
        } else {
          setCustomerMode("manual");
          setCustomerName(ext.fromName || "");
          setCustomerEmail(ext.fromEmail || "");
        }
        return;
      }

      // Set channel
      const channel = ext.order_channel === "retail" ? "storefront" : "wholesale";
      setOrderChannel(channel as "wholesale" | "storefront");

      // Set customer info
      if (ext.customer.matched_contact_id) {
        // AI matched a contact — fetch to populate all fields
        fetch(`/api/contacts?search=${encodeURIComponent(ext.customer.email || ext.customer.name || "")}&status=all&page=1`)
          .then((r) => r.json())
          .then((data) => {
            const match = (data.contacts || []).find(
              (c: Contact) => c.id === ext.customer.matched_contact_id
            );
            if (match) {
              setSelectedContact(match);
              setCustomerName(`${match.first_name} ${match.last_name}`.trim());
              setCustomerEmail(match.email || "");
              setCustomerBusiness(match.business_name || "");
              setCustomerPhone(match.phone || "");
            }
          })
          .catch(() => {});
      } else if (ext.senderContact) {
        // AI didn't match a contact but sender email matched one — auto-select
        setSelectedContact({
          id: ext.senderContact.contact_id,
          first_name: ext.senderContact.first_name,
          last_name: ext.senderContact.last_name,
          email: ext.senderContact.email,
          phone: ext.senderContact.phone || undefined,
          business_name: ext.senderContact.business_name || undefined,
        });
        setCustomerName(`${ext.senderContact.first_name} ${ext.senderContact.last_name}`.trim());
        setCustomerEmail(ext.senderContact.email || "");
        setCustomerBusiness(ext.senderContact.business_name || "");
        setCustomerPhone(ext.senderContact.phone || "");
      } else {
        // No contact match — pre-fill from extraction or email sender
        setCustomerMode("manual");
        setCustomerName(ext.customer.name || ext.fromName || "");
        setCustomerEmail(ext.customer.email || ext.fromEmail || "");
        setCustomerBusiness(ext.customer.business_name || "");
      }

      // Set notes
      const notesParts: string[] = [];
      if (ext.delivery_notes) notesParts.push(`Delivery: ${ext.delivery_notes}`);
      if (ext.raw_notes) notesParts.push(ext.raw_notes);
      if (notesParts.length > 0) setNotes(notesParts.join("\n\n"));

      // Pre-populate matched products
      if (ext.items.length > 0) {
        fetch("/api/products")
          .then((r) => r.json())
          .then((data) => {
            const allProducts: Product[] = (data.products || []).filter(
              (p: Product) => p.status === "published"
            );
            const newItems: OrderItem[] = [];
            const unmatched: string[] = [];

            for (const extractedItem of ext.items) {
              if (extractedItem.matched_product_id) {
                const product = allProducts.find((p) => p.id === extractedItem.matched_product_id);
                if (product) {
                  let variant: ProductVariant | undefined;
                  if (extractedItem.matched_variant_id) {
                    variant = product.product_variants.find(
                      (v) => v.id === extractedItem.matched_variant_id
                    );
                  }
                  const unitPrice = getPrice(product, variant || null, channel as "wholesale" | "storefront");
                  newItems.push({
                    productId: product.id,
                    productName: product.name,
                    variantId: variant?.id,
                    variantLabel: variant ? getVariantLabel(variant) : undefined,
                    unitPrice,
                    quantity: extractedItem.quantity || 1,
                    unit: variant?.unit || product.unit || "unit",
                  });
                  continue;
                }
              }
              // No match — record for banner
              unmatched.push(
                `${extractedItem.product_name}${extractedItem.variant_description ? ` (${extractedItem.variant_description})` : ""} x${extractedItem.quantity || 1}`
              );
            }

            if (newItems.length > 0) setItems(newItems);

            setExtractionBanner({
              confidence: ext.confidence,
              unmatchedItems: unmatched,
              subject: ext.subject || undefined,
            });
          })
          .catch(() => {});
      } else {
        setExtractionBanner({
          confidence: ext.confidence,
          unmatchedItems: [],
          subject: ext.subject || undefined,
        });
      }
    } catch {
      // Invalid sessionStorage data — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Select contact ──
  function handleSelectContact(contact: Contact) {
    setSelectedContact(contact);
    setCustomerName(
      `${contact.first_name} ${contact.last_name}`.trim()
    );
    setCustomerEmail(contact.email || "");
    setCustomerBusiness(contact.business_name || "");
    setCustomerPhone(contact.phone || "");
    setContactSearch("");
    setShowContactDropdown(false);
  }

  function handleClearContact() {
    setSelectedContact(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerBusiness("");
    setCustomerPhone("");
  }

  // ── Add product ──
  function handleAddProduct(product: Product, variant?: ProductVariant) {
    const unitPrice = getPrice(product, variant || null, orderChannel);
    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      variantId: variant?.id,
      variantLabel: variant ? getVariantLabel(variant) : undefined,
      unitPrice,
      quantity: 1,
      unit: variant?.unit || product.unit || "unit",
    };
    setItems((prev) => [...prev, newItem]);
    setShowProductSearch(false);
    setProductSearch("");
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateItemQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  }

  function handleUpdateItemPrice(index: number, price: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, unitPrice: Math.max(0, price) } : item
      )
    );
  }

  // ── Recalculate prices when channel changes ──
  // (We don't auto-recalculate since prices are editable and user may have overridden them)

  // ── Subtotal ──
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // ── Submit ──
  const handleSubmit = async () => {
    setError("");
    if (!customerName || !customerEmail) {
      setError("Customer name and email are required.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one product.");
      return;
    }
    if (includeAddress && (!address.line1 || !address.city || !address.postcode)) {
      setError(
        "Delivery address requires at least Address Line 1, City, and Postcode."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderChannel,
          customerName,
          customerEmail,
          customerBusiness: customerBusiness || undefined,
          customerPhone: customerPhone || undefined,
          contactId: selectedContact?.id || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variantId: i.variantId || undefined,
            variantLabel: i.variantLabel || undefined,
            unitPrice: i.unitPrice,
          })),
          deliveryAddress: includeAddress
            ? {
                label: address.label || undefined,
                line1: address.line1,
                line2: address.line2 || undefined,
                city: address.city,
                county: address.county || undefined,
                postcode: address.postcode,
                country: address.country,
              }
            : undefined,
          paymentMethod,
          paymentTerms:
            orderChannel === "wholesale" ? paymentTerms : undefined,
          notes: notes || undefined,
          inboxMessageId: inboxMessageId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      router.push(
        `/orders/${data.orderId}?type=${orderChannel === "wholesale" ? "wholesale" : "storefront"}&created=true`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create order"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Form content (used in both layouts) ──
  const formContent = (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => router.push("/orders")}
            className="text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Create Order</h1>
          {emailMessageId && !emailPanelOpen && (
            <button
              onClick={() => setEmailPanelOpen(true)}
              className="lg:hidden ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Show Email
            </button>
          )}
        </div>
        <p className="text-slate-500">
          Manually create an order for a customer.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Extraction banner */}
      {extractionBanner && (
        <div className={`mb-6 rounded-xl border p-4 ${
          extractionBanner.confidence === "high"
            ? "bg-green-50 border-green-200"
            : extractionBanner.confidence === "medium"
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-start gap-3">
            <Mail className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              extractionBanner.confidence === "high"
                ? "text-green-600"
                : extractionBanner.confidence === "medium"
                  ? "text-amber-600"
                  : "text-slate-500"
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                extractionBanner.confidence === "high"
                  ? "text-green-800"
                  : extractionBanner.confidence === "medium"
                    ? "text-amber-800"
                    : "text-slate-700"
              }`}>
                {`Pre-filled from email${extractionBanner.subject ? `: "${extractionBanner.subject}"` : ""}`}
              </p>
              <p className={`text-sm mt-0.5 ${
                extractionBanner.confidence === "high"
                  ? "text-green-700"
                  : extractionBanner.confidence === "medium"
                    ? "text-amber-700"
                    : "text-slate-600"
              }`}>
                {extractionBanner.confidence === "high"
                  ? "All details were matched with high confidence. Please review before confirming."
                  : extractionBanner.confidence === "medium"
                    ? "Some details were matched. Please review and fill in any missing information."
                    : "Limited details could be extracted. Please fill in the order manually."}
              </p>
              {extractionBanner.unmatchedItems.length > 0 && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Unmatched items:</p>
                    <ul className="text-sm text-amber-600 mt-1 space-y-0.5">
                      {extractionBanner.unmatchedItems.map((item, i) => (
                        <li key={i}>{`\u2022 ${item}`}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-500 mt-1">Add these products manually below.</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setExtractionBanner(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Section 1: Order Channel ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Order Channel
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderChannel("wholesale")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                orderChannel === "wholesale"
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Wholesale
            </button>
            <button
              onClick={() => setOrderChannel("storefront")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                orderChannel === "storefront"
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Retail
            </button>
          </div>
        </div>

        {/* ── Section 2: Customer ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Customer
          </h2>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setCustomerMode("search");
                handleClearContact();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                customerMode === "search"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Select existing contact
            </button>
            <button
              onClick={() => {
                setCustomerMode("manual");
                handleClearContact();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                customerMode === "manual"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Enter new customer details
            </button>
          </div>

          {customerMode === "search" && (
            <div>
              {selectedContact ? (
                <div className="flex items-center justify-between bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {`${selectedContact.first_name} ${selectedContact.last_name}`.trim()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedContact.email}
                        {selectedContact.business_name
                          ? ` \u00B7 ${selectedContact.business_name}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearContact}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={contactSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="Search contacts by name, email, or business..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    {isSearchingContacts && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                    )}
                  </div>
                  {showContactDropdown && contactResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {contactResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectContact(c)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {`${c.first_name} ${c.last_name}`.trim()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.email}
                            {c.business_name
                              ? ` \u00B7 ${c.business_name}`
                              : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {showContactDropdown &&
                    contactResults.length === 0 &&
                    !isSearchingContacts &&
                    contactSearch.trim() && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-sm text-slate-500 text-center">
                        No contacts found
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {(customerMode === "manual" || selectedContact) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  readOnly={!!selectedContact}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  readOnly={!!selectedContact}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={customerBusiness}
                  onChange={(e) => setCustomerBusiness(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  readOnly={!!selectedContact}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  readOnly={!!selectedContact}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Products ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Products</h2>
            <div className="relative" ref={productSearchRef}>
              <button
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="inline-flex items-center gap-1.5 bg-brand-600 text-white hover:bg-brand-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>

              {showProductSearch && (
                <div className="absolute right-0 z-20 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg">
                  <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {isSearchingProducts && (
                      <div className="p-4 text-center text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Loading products...
                      </div>
                    )}
                    {!isSearchingProducts && productResults.length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No products found
                      </div>
                    )}
                    {!isSearchingProducts &&
                      productResults.map((product) => {
                        const channelFilter = orderChannel === "wholesale" ? "wholesale" : "retail";
                        const activeVariants = product.product_variants?.filter(
                          (v) => v.is_active && (!v.channel || v.channel === channelFilter)
                        );
                        const hasVariants =
                          activeVariants && activeVariants.length > 0;

                        if (hasVariants) {
                          return (
                            <div key={product.id}>
                              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-sm font-medium text-slate-900">
                                  {product.name}
                                </p>
                              </div>
                              {activeVariants.map((variant) => (
                                <button
                                  key={variant.id}
                                  onClick={() =>
                                    handleAddProduct(product, variant)
                                  }
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 pl-8"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700">
                                      {getVariantLabel(variant)}
                                    </span>
                                    <span className="text-sm font-medium text-slate-900">
                                      {formatPrice(
                                        getPrice(
                                          product,
                                          variant,
                                          orderChannel
                                        )
                                      )}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {product.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {product.unit}
                                </p>
                              </div>
                              <span className="text-sm font-medium text-slate-900">
                                {formatPrice(
                                  getPrice(product, null, orderChannel)
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No products added yet. Click &quot;Add Product&quot; to get
                started.
              </p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div className="col-span-4">Product</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-3 text-right">Line Total</div>
                <div className="col-span-1" />
              </div>

              {/* Items */}
              {items.map((item, index) => (
                <div
                  key={`${item.productId}-${item.variantId || "base"}-${index}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 items-center"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-slate-900">
                      {item.productName}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-slate-500">
                        {item.variantLabel}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        &pound;
                      </span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateItemPrice(
                            index,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        min="0"
                        className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItemQuantity(
                          index,
                          parseInt(e.target.value) || 1
                        )
                      }
                      min="1"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-medium text-slate-900">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Subtotal */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-b-lg mt-2">
                <span className="text-sm font-medium text-slate-700">
                  Subtotal
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 4: Delivery Address ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Delivery Address
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAddress}
                onChange={(e) => setIncludeAddress(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-600">
                Include delivery address
              </span>
            </label>
          </div>

          {includeAddress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={address.label}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder='e.g. "Main Office"'
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, line1: e.target.value }))
                  }
                  placeholder="Street address"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, line2: e.target.value }))
                  }
                  placeholder="Apartment, suite, etc."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="City"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  County
                </label>
                <input
                  type="text"
                  value={address.county}
                  onChange={(e) =>
                    setAddress((prev) => ({ ...prev, county: e.target.value }))
                  }
                  placeholder="County"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address.postcode}
                  onChange={(e) =>
                    setAddress((prev) => ({
                      ...prev,
                      postcode: e.target.value,
                    }))
                  }
                  placeholder="Postcode"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={address.country}
                  onChange={(e) =>
                    setAddress((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No delivery address will be included with this order.
            </p>
          )}
        </div>

        {/* ── Section 5: Payment & Terms ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Payment &amp; Terms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full appearance-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white pr-8"
                >
                  <option value="invoice">Invoice</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {orderChannel === "wholesale" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Terms
                </label>
                <div className="relative">
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full appearance-none px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white pr-8"
                  >
                    <option value="prepay">Prepay</option>
                    <option value="net7">Net 7</option>
                    <option value="net14">Net 14</option>
                    <option value="net30">Net 30</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 6: Notes ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or special instructions for this order..."
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
          />
        </div>

        {/* ── Section 7: Order Summary ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Order Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="text-sm font-medium text-slate-900">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Number of items</span>
              <span className="text-sm font-medium text-slate-900">
                {totalItems}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Channel</span>
              <span className="text-sm font-medium text-slate-900 capitalize">
                {orderChannel === "storefront" ? "Retail" : "Wholesale"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status</span>
              <StatusBadge status="confirmed" type="order" />
            </div>
            {customerName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Customer</span>
                <span className="text-sm font-medium text-slate-900">
                  {customerName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push("/orders")}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-brand-600 text-white hover:bg-brand-700 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {isSubmitting ? "Creating..." : "Create Order"}
          </button>
        </div>
      </div>
    </>
  );

  // ── No email panel — render form directly ──
  if (!emailMessageId) {
    return <div>{formContent}</div>;
  }

  // ── Split-screen layout with email panel ──
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] -m-6">
      {/* Email panel + toggle */}
      <EmailPanel
        messageId={emailMessageId}
        isOpen={emailPanelOpen}
        onToggle={() => setEmailPanelOpen(!emailPanelOpen)}
      />

      {/* Order form */}
      <div className="flex-1 overflow-y-auto p-6">
        {formContent}
      </div>
    </div>
  );
}

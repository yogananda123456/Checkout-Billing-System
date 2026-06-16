import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, ShoppingBag, Tag, Receipt, Minus, CheckCircle2, History, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Item = { id: string; name: string; price: number; quantity: number };
type Order = {
  id: string;
  placedAt: string;
  items: Item[];
  subtotal: number;
  discount: number;
  offer: OfferKey | null;
  GST: number;
  total: number;
};

const TAX_RATE = 0.05; // 5%
const OFFERS = {
  SAVE10: {
    label: "10% off on orders above ₹999",
    type: "percent" as const,
    value: 0.1,
    min: 1000,
  },

  FLAT50: {
    label: "₹50 off on orders above ₹599",
    type: "threshold" as const,
    value: 50,
    min: 600,
  },

  BOGO15: {
    label: "₹15 off on orders above ₹199",
    type: "threshold" as const,
    value: 15,
    min: 200,
  },
};
type OfferKey = keyof typeof OFFERS;
const ORDERS_KEY = "checkout.orders.v1";

const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

function computeOfferDiscount(key: OfferKey, subtotal: number) {
  const o = OFFERS[key];

  if (o.type === "percent") {
    return {
      amount: subtotal >= o.min ? subtotal * o.value : 0,
      valid: subtotal >= o.min,
    };
  }

  return {
    amount: subtotal >= o.min ? o.value : 0,
    valid: subtotal >= o.min,
  };
}

export default function App() {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem("checkout.cart.v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [offer, setOffer] = useState<OfferKey | null>(() => {
    try {
      const saved = localStorage.getItem("checkout.offer.v1");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<"cart" | "confirmation">("cart");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("checkout.cart.v1", JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem("checkout.offer.v1", JSON.stringify(offer));
    } catch {}
  }, [offer]);

  const persistOrders = (next: Order[]) => {
    setOrders(next);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch {}
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseInt(qty, 10);
    if (!name.trim()) return toast.error("Enter an item name");
    if (!Number.isFinite(p) || p <= 0) return toast.error("Price must be greater than 0");
    if (!Number.isInteger(q) || q <= 0) return toast.error("Quantity must be a positive whole number");
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), price: p, quantity: q }]);
    setName(""); setPrice(""); setQty("1");
    toast.success(`Added ${name.trim()}`);
  };

  const updateQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.flatMap((it) => {
        if (it.id !== id) return [it];
        const nq = it.quantity + delta;
        return nq <= 0 ? [] : [{ ...it, quantity: nq }];
      }),
    );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const { subtotal, discount, GST, total } = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = offer ? computeOfferDiscount(offer, subtotal).amount : 0;
    const taxable = Math.max(0, subtotal - discount);
    const GST = taxable * TAX_RATE;
    return { subtotal, discount, GST, total: taxable + GST };
  }, [items, offer]);

  const placeOrder = () => {
    if (items.length === 0) return;
    const order: Order = {
      id: crypto.randomUUID(),
      placedAt: new Date().toISOString(),
      items,
      subtotal,
      discount,
      offer,
      GST,
      total,
    };
    persistOrders([order, ...orders]);
    setLastOrder(order);
    setItems([]);
    setOffer(null);
    setView("confirmation");
    toast.success("Order placed!", { description: `Charged ${currency(total)}` });
  };

  if (view === "confirmation" && lastOrder) {
    return (
      <ConfirmationView
        order={lastOrder}
        orders={orders}
        onBack={() => setView("cart")}
        onClearHistory={() => persistOrders([])}
      />
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Checkout Billing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground">
            A simpler way to <span className="italic text-primary">ring it up</span>.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Add items, stack an offer, and watch the bill compute itself — taxes included.
          </p>
          {orders.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => {
                setLastOrder(orders[0]);
                setView("confirmation");
              }}
            >
              <History className="h-4 w-4" /> View past orders ({orders.length})
            </Button>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Plus className="h-5 w-5 text-primary" /> Add an item
              </h2>
              <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-[1fr_120px_100px_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Add item here" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qty">Qty</Label>
                  <Input id="qty" type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full sm:w-auto">Add</Button>
                </div>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ShoppingBag className="h-5 w-5 text-primary" /> Cart
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {items.reduce((s, i) => s + i.quantity, 0)} item(s)
                </span>
              </h2>
              {items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Your cart is empty. Add an item to get started.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{it.name}</div>
                        <div className="text-sm text-muted-foreground">{currency(it.price)} each</div>
                      </div>
                      <div className="flex items-center gap-1 rounded-md border bg-secondary/50 p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(it.id, -1)} aria-label="Decrease">
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">{it.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(it.id, 1)} aria-label="Increase">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="w-24 text-right font-semibold tabular-nums">
                        {currency(it.price * it.quantity)}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-8 self-start">
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Tag className="h-5 w-5 text-primary" /> Offers
              </h2>
              <div className="space-y-2">
                {(Object.keys(OFFERS) as OfferKey[]).map((key) => {
                  const o = OFFERS[key];
                  const { amount, valid } = computeOfferDiscount(key, subtotal);
                  const active = offer === key;
                  const disabled = !valid;
                  return (
                    <button
                      key={key}
                      onClick={() => !disabled && setOffer(active ? null : key)}
                      disabled={disabled}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        disabled
                          ? "border-border bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
                          : active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`font-mono text-sm font-semibold ${disabled ? "text-muted-foreground" : ""}`}>{key}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.label}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-semibold tabular-nums ${disabled ? "text-muted-foreground" : "text-success"}`}>
                            {disabled ? "—" : `− ${currency(amount)}`}
                          </span>
                          {active && !disabled && <Badge>Applied</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Bill summary</h2>
              <dl className="space-y-2.5 text-sm">
                <Row label="Subtotal" value={currency(subtotal)} />
<Row
  label={
    discount > 0 && offer
      ? `Discount (${offer})`
      : "Discount"
  }
  value={`− ${currency(discount)}`}
  muted={discount === 0}
  accent={discount > 0}
/>
                <Row label={`GST (${(TAX_RATE * 100).toFixed(0)}%)`} value={currency(GST)} />
                <Separator className="my-3" />
                <div className="flex items-baseline justify-between">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums text-primary">
                    {currency(total)}
                  </dd>
                </div>
              </dl>
              <Button className="mt-6 w-full" size="lg" disabled={items.length === 0} onClick={() => setShowConfirm(true)}>
                Place order
              </Button>
              {discount > 0 && (
                <p className="mt-3 text-center text-xs text-success">
                  You saved {currency(discount)} with {offer}.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm the order?</DialogTitle>
            <DialogDescription>
              You are about to place an order for{" "}
              <span className="font-semibold text-foreground">{currency(total)}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Go Back
            </Button>
            <Button
              onClick={() => {
                setShowConfirm(false);
                placeOrder();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmationView({
  order,
  orders,
  onBack,
  onClearHistory,
}: {
  order: Order;
  orders: Order[];
  onBack: () => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="min-h-screen px-4 py-10 sm:py-16">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to checkout
        </Button>

        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success animate-tick-pop" />
          </div>
          <h1 className="text-3xl font-semibold">Order confirmed</h1>
          <p className="mt-2 text-muted-foreground">
            Placed on {new Date(order.placedAt).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</p>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="mb-4 text-lg font-semibold">Summary</h2>
          <div className="mb-2 flex items-center justify-between border-b pb-2 text-sm font-semibold text-muted-foreground">
  <span>Items</span>
  <span>Price</span>
</div>
          <ul className="divide-y divide-border">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {currency(it.price)} × {it.quantity}
                  </div>
                </div>
                <div className="tabular-nums font-semibold">{currency(it.price * it.quantity)}</div>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={currency(order.subtotal)} />
            <Row
              label={order.offer ? `Discount (${order.offer})` : "Discount"}
              value={`− ${currency(order.discount)}`}
              muted={order.discount === 0}
              accent={order.discount > 0}
            />
            <Row label={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`} value={currency(order.GST)} />
            <Separator className="my-3" />
            <div className="flex items-baseline justify-between">
              <dt className="text-base font-semibold">Total paid</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-primary">
                {currency(order.total)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="mt-6 p-6">
         <div className="mb-4 flex items-center gap-2">
  <History className="h-5 w-5 text-primary" />
  <h2 className="text-lg font-semibold">
    Past Orders ({orders.length})
  </h2>

  <Button
    variant="ghost"
    size="sm"
    className="ml-auto text-muted-foreground hover:text-destructive"
    onClick={onClearHistory}
  >
    Clear
  </Button>
</div>
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No past orders yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                    <div className="truncate">
                      {o.items.length} item(s) · {new Date(o.placedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="tabular-nums font-semibold">{currency(o.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className={
          accent
            ? "text-success font-medium"
            : muted
            ? "text-muted-foreground"
            : ""
        }
      >
        {label}
      </dt>

      <dd
        className={`tabular-nums ${
          accent
            ? "text-success font-medium"
            : muted
            ? "text-muted-foreground"
            : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
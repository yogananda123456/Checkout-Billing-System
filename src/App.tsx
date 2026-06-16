
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, ShoppingBag, Tag, Receipt, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";



type Item = { id: string; name: string; price: number; quantity: number };

const TAX_RATE = 0.05; // 5%
const OFFERS = {
  SAVE10: { label: "10% off", type: "percent" as const, value: 0.1 },
  FLAT50: { label: "₹50 off", type: "flat" as const, value: 50 },
  BOGO100: { label: "₹100 off over ₹500", type: "threshold" as const, value: 100, min: 500 },
};
type OfferKey = keyof typeof OFFERS;

const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default function App() {
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem("cart-items");
    return saved ? JSON.parse(saved) : [
      { id: crypto.randomUUID(), name: "Espresso Beans 250g", price: 450, quantity: 1 },
      { id: crypto.randomUUID(), name: "Bean Bag", price: 1999, quantity: 2 },
    ];
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [offer, setOffer] = useState<OfferKey | null>(() => {
    const saved = localStorage.getItem("selected-offer");
    return saved ? (JSON.parse(saved) as OfferKey) : null;
  });

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cart-items", JSON.stringify(items));
  }, [items]);

  // Save offer to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selected-offer", JSON.stringify(offer));
  }, [offer]);

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

  const { subtotal, discount, taxable, tax, total } = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    let discount = 0;
    if (offer) {
      const o = OFFERS[offer];
      if (o.type === "percent") discount = subtotal * o.value;
      else if (o.type === "flat") discount = Math.min(o.value, subtotal);
      else if (o.type === "threshold" && subtotal >= o.min) discount = o.value;
    }
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * TAX_RATE;
    return { subtotal, discount, taxable, tax, total: taxable + tax };
  }, [items, offer]);

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
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* LEFT: items */}
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

          {/* RIGHT: summary */}
          <div className="space-y-6 lg:sticky lg:top-8 self-start">
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Tag className="h-5 w-5 text-primary" /> Offers
              </h2>
              <div className="space-y-2">
                {(Object.keys(OFFERS) as OfferKey[]).map((key) => {
                  const o = OFFERS[key];
                  const active = offer === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setOffer(active ? null : key)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-mono text-sm font-semibold">{key}</div>
                          <div className="text-xs text-muted-foreground">{o.label}{o.type === "threshold" ? ` (min ${currency(o.min)})` : ""}</div>
                        </div>
                        {active && <Badge>Applied</Badge>}
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
                <Row label="Discount" value={`− ${currency(discount)}`} muted={discount === 0} accent={discount > 0} />
                <Row label={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`} value={currency(tax)} />
                <Separator className="my-3" />
                <div className="flex items-baseline justify-between">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums text-primary">
                    {currency(total)}
                  </dd>
                </div>
              </dl>
              <Button className="mt-6 w-full" size="lg" disabled={items.length === 0} onClick={() => toast.success("Order placed!", { description: `Charged ${currency(total)}` })}>
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
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-success font-medium" : muted ? "text-muted-foreground" : ""}`}>{value}</dd>
    </div>
  );
}

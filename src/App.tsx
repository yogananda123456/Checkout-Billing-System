function App() {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl bg-white p-8 shadow">
          <h1 className="text-4xl font-bold text-slate-800">
            Checkout Billing System
          </h1>

          <p className="mt-2 text-slate-500">
            Calculate cart totals, discounts and taxes instantly.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Add Item
            </h2>

            <div className="space-y-4">
              <input
                className="w-full rounded-lg border p-3"
                placeholder="Item Name"
              />

              <input
                className="w-full rounded-lg border p-3"
                placeholder="Price"
              />

              <input
                className="w-full rounded-lg border p-3"
                placeholder="Quantity"
              />

              <button
                className="w-full rounded-lg bg-slate-800 p-3 text-white"
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Bill Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>Discount</span>
                <span>₹0.00</span>
              </div>

              <div className="flex justify-between">
                <span>Tax</span>
                <span>₹0.00</span>
              </div>

              <hr />

              <div className="flex justify-between text-xl font-bold">
                <span>Final Amount</span>
                <span>₹0.00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Cart Items
          </h2>

          <p className="text-slate-500">
            No items added yet.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
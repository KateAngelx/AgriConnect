'use client'

import { useActionState, useMemo, useState } from 'react'
import { placeOrderAction } from '@/app/(frontend)/checkout/actions'
import { peso } from '@/lib/dashboard-format'
import { CheckoutDeliveryEta } from '@/components/checkout-delivery-eta'
import { LocationPicker } from '@/components/location-picker'

export function CheckoutForm({ user, summary, electronicPayments, electronicProvider, deliveryFee }) {
  const [state, checkoutAction, pending] = useActionState(placeOrderAction, { error: '' })
  const [fulfillment, setFulfillment] = useState('pickup')
  const savedAddresses = Array.isArray(user.savedAddresses) ? user.savedAddresses : []
  const defaultAddress = savedAddresses[0]
  const [deliveryAddress, setDeliveryAddress] = useState(defaultAddress?.address || '')
  const [deliveryLandmark, setDeliveryLandmark] = useState(defaultAddress?.landmark || '')
  const [deliveryLat, setDeliveryLat] = useState(defaultAddress ? String(defaultAddress.lat) : '')
  const [deliveryLng, setDeliveryLng] = useState(defaultAddress ? String(defaultAddress.lng) : '')
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddress?.id || '')

  const sellerCount = summary.sellerGroups.length
  const deliveryFees = fulfillment === 'delivery' ? deliveryFee * sellerCount : 0
  const grandTotal = summary.subtotal + deliveryFees

  const deliverySection = useMemo(
    () =>
      fulfillment === 'delivery' ? (
        <div className="space-y-4">
          {savedAddresses.length ? (
            <div>
              <label className="text-sm font-bold" htmlFor="savedDeliveryAddress">Saved location</label>
              <select
                id="savedDeliveryAddress"
                value={selectedAddressId}
                onChange={(event) => {
                  const selected = savedAddresses.find((item) => item.id === event.target.value)
                  setSelectedAddressId(event.target.value)
                  if (selected) {
                    setDeliveryAddress(selected.address)
                    setDeliveryLandmark(selected.landmark || '')
                    setDeliveryLat(String(selected.lat))
                    setDeliveryLng(String(selected.lng))
                  }
                }}
                className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              >
                <option value="">Use a different location</option>
                {savedAddresses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label className="text-sm font-bold" htmlFor="deliveryAddress">Delivery address</label>
            <textarea
              id="deliveryAddress"
              name="deliveryAddress"
              rows={3}
              required
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Street, barangay, city"
            />
          </div>
          <div>
            <label className="text-sm font-bold" htmlFor="deliveryLandmark">
              Landmark or notes (optional)
            </label>
            <input
              id="deliveryLandmark"
              name="deliveryLandmark"
              value={deliveryLandmark}
              onChange={(event) => setDeliveryLandmark(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
              placeholder="Near church, gate color, etc."
            />
          </div>
          <div>
            <p className="text-sm font-bold">Drop delivery pin</p>
            <LocationPicker
              lat={deliveryLat}
              lng={deliveryLng}
              onChange={({ lat, lng }) => {
                setDeliveryLat(String(lat))
                setDeliveryLng(String(lng))
              }}
            />
            <input type="hidden" name="deliveryLat" value={deliveryLat} />
            <input type="hidden" name="deliveryLng" value={deliveryLng} />
          </div>
          <CheckoutDeliveryEta
            sellerGroups={summary.sellerGroups}
            deliveryLat={deliveryLat}
            deliveryLng={deliveryLng}
          />
        </div>
      ) : (
        <input type="hidden" name="deliveryAddress" value="" />
      ),
    [fulfillment, deliveryAddress, deliveryLandmark, deliveryLat, deliveryLng, selectedAddressId, savedAddresses],
  )

  return (
    <form action={checkoutAction} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6 rounded-[2rem] border border-[#173c2c]/10 bg-white p-7 shadow-sm">
        {state.error ? (
          <p role="alert" className="rounded-xl bg-[#fff1ed] px-4 py-3 text-sm text-[#963b2d]">
            {state.error}
          </p>
        ) : null}
        <div>
          <label className="text-sm font-bold" htmlFor="contactNumber">
            Contact number
          </label>
          <input
            id="contactNumber"
            name="contactNumber"
            required
            defaultValue={user.phone || ''}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </div>
        <fieldset>
          <legend className="text-sm font-bold">Fulfillment</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="rounded-2xl border border-black/10 p-4 has-[:checked]:border-[#5dbb38] has-[:checked]:bg-[#f4faf0]">
              <input
                type="radio"
                name="fulfillment"
                value="pickup"
                checked={fulfillment === 'pickup'}
                onChange={() => setFulfillment('pickup')}
              />{' '}
              <strong>Pickup</strong>
              <span className="mt-1 block text-xs text-[#647066]">No delivery fee</span>
            </label>
            <label className="rounded-2xl border border-black/10 p-4 has-[:checked]:border-[#5dbb38] has-[:checked]:bg-[#f4faf0]">
              <input
                type="radio"
                name="fulfillment"
                value="delivery"
                checked={fulfillment === 'delivery'}
                onChange={() => setFulfillment('delivery')}
              />{' '}
              <strong>Delivery</strong>
              <span className="mt-1 block text-xs text-[#647066]">
                + {peso(deliveryFee)} per seller order
              </span>
            </label>
          </div>
        </fieldset>
        {deliverySection}
        <fieldset>
          <legend className="text-sm font-bold">Payment</legend>
          <div className="mt-3 grid gap-3">
            <label className="rounded-2xl border border-black/10 p-4 has-[:checked]:border-[#5dbb38] has-[:checked]:bg-[#f4faf0]">
              <input type="radio" name="paymentMethod" value="cash" defaultChecked />{' '}
              <strong>Cash</strong>
              <span className="mt-1 block text-xs text-[#647066]">
                Pay in cash on pickup or cash on delivery (COD). No online wallet required.
              </span>
            </label>
            {electronicPayments ? (
              <label className="rounded-2xl border border-black/10 p-4 has-[:checked]:border-[#5dbb38] has-[:checked]:bg-[#f4faf0]">
                <input type="radio" name="paymentMethod" value={electronicProvider} />{' '}
                <strong>Online (GCash, Maya, GrabPay, card)</strong>
                <span className="mt-1 block text-xs text-[#647066]">
                  Secure {electronicProvider === 'xendit' ? 'Xendit' : 'PayMongo'} checkout after your order is reserved.
                </span>
              </label>
            ) : null}
          </div>
        </fieldset>
        <div>
          <label className="text-sm font-bold" htmlFor="instructions">
            Instructions
          </label>
          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3"
          />
        </div>
      </section>
      <aside className="h-fit rounded-[2rem] bg-[#142a19] p-7 text-white">
        <h2 className="text-xl font-bold">Order summary</h2>
        <div className="mt-5 space-y-6">
          {summary.sellerGroups.map((group) => (
            <div key={group.sellerId} className="rounded-xl bg-white/5 p-4">
              <p className="text-sm font-bold text-[#5dbb38]">{group.farmName}</p>
              <p className="mt-1 text-xs leading-5 text-white/60">Area: {group.pickupLocation}</p>
              {group.landmark ? (
                <p className="text-xs text-white/50">Landmark: {group.landmark}</p>
              ) : null}
              <ul className="mt-3 space-y-2 text-sm">
                {group.items.map((line) => (
                  <li key={line.cartItemId} className="flex justify-between gap-3">
                    <span className="text-white/65">
                      {line.quantity} × {line.product.name}
                    </span>
                    <span>{peso(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              {fulfillment === 'delivery' ? (
                <p className="mt-2 text-xs text-white/55">Delivery fee: {peso(deliveryFee)}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Subtotal</span>
            <span>{peso(summary.subtotal)}</span>
          </div>
          {fulfillment === 'delivery' ? (
            <div className="flex justify-between">
              <span className="text-white/70">Delivery fees</span>
              <span>{peso(deliveryFees)}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{peso(grandTotal)}</span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-[#5dbb38] px-5 py-4 font-bold disabled:opacity-60"
        >
          {pending ? 'Placing order…' : 'Place order →'}
        </button>
      </aside>
    </form>
  )
}

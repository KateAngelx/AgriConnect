import { peso, pretty } from '@/lib/dashboard-format'
import { formatDateTime } from '@/lib/date-time'
import { PagedRows } from '@/components/paged-rows'

const payoutTone = {
  released: 'bg-[#e8f5e3] text-[#1b5e20]',
  paid: 'bg-[#e8f5e3] text-[#1b5e20]',
  collected: 'bg-[#e8f5e3] text-[#1b5e20]',
  ready: 'bg-[#fff6dc] text-[#7a5a00]',
  'not-yet': 'bg-[#f1f3f1] text-[#5c6f62]',
  unpaid: 'bg-[#fff6dc] text-[#7a5a00]',
  none: 'bg-[#f1f3f1] text-[#8a968d]',
  cancelled: 'bg-[#fff1ed] text-[#963b2d]',
}

const payoutLabel = {
  released: 'Released',
  paid: 'Paid',
  collected: 'Collected',
  ready: 'Ready to release',
  'not-yet': 'Order not finished',
  unpaid: 'Not paid yet',
  none: 'None',
  cancelled: 'Cancelled',
}

// 'ready' means something different for each party: release money, collect it, or pay it.
const readyLabel = { Seller: 'Ready to release', Commission: 'Ready to collect', Courier: 'Ready to pay' }

function Chip({ status, prefix }) {
  const label = status === 'ready' ? readyLabel[prefix] || payoutLabel.ready : payoutLabel[status] || pretty(status)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${payoutTone[status] || payoutTone.none}`}>
      {prefix}: {label}
    </span>
  )
}

function Line({ label, value, strong = false, muted = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${muted ? 'text-[#5c6f62]' : 'text-[#142016]'}`}>
      <span>{label}</span>
      <span className={strong ? 'text-base font-bold' : 'font-semibold'}>{value}</span>
    </div>
  )
}

function Split({ title, total, note, parts }) {
  return (
    <div className="rounded-xl border border-[#d5e4d4] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#5c6f62]">{title}</p>
      <p className="mt-1 text-2xl font-bold text-[#142016]">{peso(total)}</p>
      {note ? <p className="mt-1 text-[12px] leading-5 text-[#5c6f62]">{note}</p> : null}
      <div className="mt-3 space-y-1.5 border-t border-[#e5ece3] pt-3">
        {parts.map(([label, value]) => (
          <Line key={label} label={label} value={peso(value)} muted />
        ))}
      </div>
    </div>
  )
}

/** Totals for a period: what buyers pay, and where every peso goes. */
export function MoneySummary({ totals, commissionRate }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <Split
          title="Order total (buyers pay)"
          total={totals.orderTotal}
          note={`${totals.orders} orders · ${totals.cancelledOrders} cancelled (counted as ₱0)`}
          parts={[
            ['Product sales', totals.productSales],
            ['Delivery fees', totals.deliveryFees],
            ['Already paid by buyers', totals.buyerPaid],
            ['Not paid yet', totals.buyerUnpaid],
          ]}
        />
        <Split
          title="Seller payouts"
          total={totals.sellerNet}
          note="Product sales minus platform commission."
          parts={[
            ['Released to sellers', totals.sellerReleased],
            ['Ready to release', totals.sellerReady],
            ['Order not finished', totals.sellerNotYet],
          ]}
        />
        <Split
          title="Platform commission"
          total={totals.commission}
          note={`₱${commissionRate} per item on delivery orders. Cash pickup orders pay none. Taken from the seller's share, never added to the buyer's price.`}
          parts={[
            ['Collected', totals.commissionCollected],
            ['Ready to collect', totals.commissionReady],
            ['Order not finished', totals.commissionNotYet],
          ]}
        />
        <Split
          title="Courier fees"
          total={totals.courierFees}
          note="The delivery fee the buyer pays goes to the courier (₱49 per delivery order)."
          parts={[
            ['Paid to couriers', totals.courierPaid],
            ['Ready to pay', totals.courierReady],
            ['Order not finished', totals.courierNotYet],
          ]}
        />
      </div>
      <p className="rounded-xl bg-[#f7fbf4] px-4 py-3 text-sm text-[#142016]">
        <strong>{peso(totals.orderTotal)}</strong> order total = <strong>{peso(totals.sellerNet)}</strong> to sellers +{' '}
        <strong>{peso(totals.commission)}</strong> platform commission + <strong>{peso(totals.courierFees)}</strong> to couriers
      </p>
    </div>
  )
}

/** One row per order showing exactly how its total is split. */
export function MoneyLedgerRows({ rows }) {
  if (!rows.length) {
    return <p className="px-4 py-6 text-sm text-[#5c6f62]">No orders in this period.</p>
  }
  return (
    <PagedRows className="divide-y divide-[#d5e4d4]">
      {rows.map((row) => (
        <li key={row.id} className={`px-4 py-4 sm:px-5 ${row.status === 'cancelled' ? 'opacity-70' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-[#142016]">{row.reference}</p>
              <p className="text-[13px] text-[#5c6f62]">
                {row.createdAt ? formatDateTime(row.createdAt) : 'Date unavailable'} · {row.buyer} → {row.seller}
                {row.courier ? ` · Courier ${row.courier}` : ''}
              </p>
              <p className="text-[13px] text-[#5c6f62]">
                {pretty(row.fulfillment)} · {pretty(row.paymentMethod)} · {row.itemCount} item{row.itemCount === 1 ? '' : 's'} ·{' '}
                {pretty(row.status)}
              </p>
            </div>
            <p className="text-lg font-bold text-[#142016]">{peso(row.orderTotal)}</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-[#f7fbf4] p-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Products', row.productSales],
              ['Delivery fee', row.deliveryFee],
              ['Order total', row.orderTotal],
              ['Commission', row.commission],
              ['Seller gets', row.sellerNet],
              ['Courier gets', row.courierFee],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] text-[#5c6f62]">{label}</dt>
                <dd className="font-semibold text-[#142016]">{peso(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip prefix="Buyer" status={row.buyerPayment} />
            <Chip prefix="Seller" status={row.sellerPayout} />
            <Chip prefix="Commission" status={row.commissionStatus} />
            <Chip prefix="Courier" status={row.courierPayout} />
          </div>
        </li>
      ))}
    </PagedRows>
  )
}

import { NextResponse } from 'next/server'
import { currentUser } from '@/server/auth'
import { isApprovedAdmin } from '@/server/roles'
import { periodLabel, readPeriod } from '@/lib/report-period'
import { moneyLedger, platformReport } from '@/server/admin'
import { commissionRate } from '@/server/payments'
import { formatDateTime } from '@/lib/date-time'

function csv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request) {
  const user = await currentUser()
  if (!user || !isApprovedAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const period = readPeriod(new URL(request.url).searchParams.get('period'))
  const [report, ledger, rate] = await Promise.all([platformReport(period), moneyLedger(period), commissionRate()])
  const t = ledger.totals

  const rows = [
    ['AgriConnect platform report', periodLabel(period)],
    [],
    ['Money summary', 'Amount (PHP)'],
    ['Order total (buyers pay)', t.orderTotal],
    ['  Product sales', t.productSales],
    ['  Delivery fees', t.deliveryFees],
    ['  Already paid by buyers', t.buyerPaid],
    ['  Not paid yet', t.buyerUnpaid],
    ['Seller payouts (product sales minus commission)', t.sellerNet],
    ['  Released to sellers', t.sellerReleased],
    ['  Ready to release', t.sellerReady],
    ['  Order not finished', t.sellerNotYet],
    [`Platform commission (PHP ${rate} per item on delivery orders)`, t.commission],
    ['  Collected', t.commissionCollected],
    ['  Ready to collect', t.commissionReady],
    ['  Order not finished', t.commissionNotYet],
    ['Courier fees (delivery fee goes to the courier)', t.courierFees],
    ['  Paid to couriers', t.courierPaid],
    ['  Ready to pay', t.courierReady],
    ['  Order not finished', t.courierNotYet],
    [],
    ['Activity', 'Count'],
    ['Orders', t.orders],
    ['Completed orders', t.completedOrders],
    ['Cancelled orders (counted as PHP 0)', t.cancelledOrders],
    ['Orders still active', report.ordersAttention],
    ['New accounts', report.users],
    ['New buyers', report.buyers],
    ['Approved sellers', report.approvedSellers],
    ['Delivery partners', report.approvedDelivery],
    ['Applications', report.applicationsTotal],
    ['Active products', report.activeProducts],
    [],
    [
      'Order',
      'Date (Philippine time)',
      'Buyer',
      'Seller',
      'Courier',
      'Fulfillment',
      'Payment method',
      'Order status',
      'Items',
      'Products (PHP)',
      'Delivery fee (PHP)',
      'Order total (PHP)',
      'Platform commission (PHP)',
      'Seller gets (PHP)',
      'Courier gets (PHP)',
      'Buyer payment',
      'Seller payout',
      'Commission',
      'Courier payout',
    ],
    ...ledger.rows.map((row) => [
      row.reference,
      row.createdAt ? formatDateTime(row.createdAt) : '',
      row.buyer,
      row.seller,
      row.courier,
      row.fulfillment,
      row.paymentMethod,
      row.status,
      row.itemCount,
      row.productSales,
      row.deliveryFee,
      row.orderTotal,
      row.commission,
      row.sellerNet,
      row.courierFee,
      row.buyerPayment,
      row.sellerPayout,
      row.commissionStatus,
      row.courierPayout,
    ]),
  ]
  const body = rows.map((row) => row.map(csv).join(',')).join('\r\n')
  return new NextResponse(`﻿${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="agriconnect-report-${period}.csv"`,
    },
  })
}

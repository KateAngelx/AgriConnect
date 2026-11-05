'use client'

export function ReceiptActions() {
  return (
    <button type="button" className="btn btn-primary receipt-actions" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  )
}

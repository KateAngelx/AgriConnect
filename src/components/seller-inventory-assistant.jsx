'use client'

import { AiAssistantPanel } from '@/components/ai-assistant-panel'

export function SellerInventoryAssistant() {
  return (
    <AiAssistantPanel
      endpoint="/api/ai/seller-inventory"
      eyebrow="Seller assistant"
      title="Inventory and listing help"
      description="Low-stock counts come from your real inventory. AI summarizes; it does not change stock without your action."
      placeholder="e.g. Compare my prices with other sellers. Which products are low on stock?"
      requestBody={{ task: 'summarize' }}
    />
  )
}

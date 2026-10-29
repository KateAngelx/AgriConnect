import { AiAssistantPanel } from '@/components/ai-assistant-panel'

export function MarketplaceAssistant({ compact = false }) {
  return (
    <AiAssistantPanel
      endpoint="/api/ai/marketplace"
      eyebrow="Marketplace assistant"
      title={compact ? 'Ask about this marketplace' : 'Compare products and sellers'}
      description={
        compact
          ? 'Answers use live listings from AgriConnect.'
          : 'Answers use live AgriConnect listings only.'
      }
      placeholder="e.g. I have ₱500 — which rice offers the best value near Laguna?"
    />
  )
}

import { currentUser } from '@/server/auth'
import { probeOpenAi } from '@/server/ai/client'
import { describeAiSetup } from '@/server/ai/ai-config'
import { hasRole } from '@/server/roles'

export async function GET() {
  const user = await currentUser()
  if (!user || !hasRole(user, 'admin')) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  return Response.json(describeAiSetup())
}

export async function POST(request) {
  const user = await currentUser()
  if (!user || !hasRole(user, 'admin')) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 })
  }
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const setup = describeAiSetup()
  if (body.test !== true) {
    return Response.json(setup)
  }
  if (!setup.hasKey) {
    const hint =
      setup.provider === 'gemini'
        ? 'Add GEMINI_API_KEY from Google AI Studio (aistudio.google.com/apikey).'
        : setup.provider === 'groq'
          ? 'Add GROQ_API_KEY from console.groq.com.'
          : 'Add the API key for your AI_PROVIDER in Figma Make env vars or .env.local.'
    return Response.json({
      ...setup,
      test: { ok: false, message: hint },
    })
  }
  if (setup.forceDatabase) {
    return Response.json({
      ...setup,
      test: {
        ok: true,
        message: 'LLM calls disabled (OPENAI_FORCE_DATABASE=1). Assistant uses live AgriConnect data only.',
        skipped: true,
      },
    })
  }
  const probe = await probeOpenAi()
  return Response.json({
    ...setup,
    test: probe,
  })
}

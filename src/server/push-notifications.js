import webPush from 'web-push'
function cleanEnv(value) {
  return String(value ?? '').trim().replace(/^["']|["']$/g, '').trim()
}

function pushConfig() {
  return {
    publicKey: cleanEnv(process.env.WEB_PUSH_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY),
    privateKey: cleanEnv(process.env.WEB_PUSH_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY),
    subject: cleanEnv(process.env.WEB_PUSH_SUBJECT) || 'mailto:admin@agriconnect.app',
  }
}

export function pushPublicKey() {
  return pushConfig().publicKey
}

export async function sendPushNotifications(subscriptions, note) {
  const config = pushConfig()
  if (!config.publicKey || !config.privateKey) return []

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return Promise.allSettled(
    subscriptions.map((subscription) =>
      webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: note.title,
          body: note.body,
          url: note.href || '/notifications',
          tag: note.id,
        }),
      ),
    ),
  )
}

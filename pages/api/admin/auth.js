import { getAdminPin } from '../../../lib/event'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const providedPin = String(req.body?.pin || '').trim()
  const expectedPin = String(getAdminPin() || '').trim()

  if (!expectedPin) {
    return res.status(500).json({ error: 'ADMIN_PIN nao configurado no ambiente.' })
  }

  if (providedPin !== expectedPin) {
    return res.status(401).json({ error: 'Senha incorreta.' })
  }

  return res.status(200).json({ ok: true })
}

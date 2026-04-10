import { supabase } from '../../lib/supabaseClient'
import { getAdminPin, getTodayKey } from '../../lib/event'
import { sendFollowupEmail } from '../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  if (String(req.headers['x-admin-pin'] || '').trim() !== getAdminPin()) {
    return res.status(401).json({ error: 'Acesso admin negado.' })
  }

  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('pagamento_confirmado', false)
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const todayKey = getTodayKey(new Date())
  const eligibleOrders = (data || []).filter((order) => {
    if (!order.last_followup_sent_at) return true
    return getTodayKey(new Date(order.last_followup_sent_at)) !== todayKey
  })

  if (!eligibleOrders.length) {
    return res.status(200).json({ message: 'Nenhum follow-up disponível para hoje.' })
  }

  let sentCount = 0

  for (const order of eligibleOrders) {
    try {
      await sendFollowupEmail(order)
      sentCount += 1
    } catch (sendError) {
      console.error(sendError)
    }

    await supabase
      .from('pedidos')
      .update({
        followup_count: Number(order.followup_count || 0) + 1,
        last_followup_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
  }

  return res.status(200).json({
    message: `${sentCount} lembrete(s) enviados manualmente hoje.`,
  })
}

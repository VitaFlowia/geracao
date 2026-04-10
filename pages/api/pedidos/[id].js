import { supabase } from '../../../lib/supabaseClient'
import { getAdminPin } from '../../../lib/event'
import { sendPaymentConfirmedEmail } from '../../../lib/email'

export default async function handler(req, res) {
  const { id } = req.query

  if (String(req.headers['x-admin-pin'] || '').trim() !== getAdminPin()) {
    return res.status(401).json({ error: 'Acesso admin negado.' })
  }

  if (req.method === 'PUT') {
    const { data: currentOrder, error: currentError } = await supabase.from('pedidos').select('*').eq('id', id).single()

    if (currentError) {
      return res.status(500).json({ error: currentError.message })
    }

    const nextPaid = typeof req.body.pagamento_confirmado === 'boolean' ? req.body.pagamento_confirmado : currentOrder.pagamento_confirmado
    const updates = {
      pagamento_confirmado: nextPaid,
      status: nextPaid ? 'pago' : 'aguardando_pagamento',
      payment_confirmed_at: nextPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('pedidos').update(updates).eq('id', id).select().single()

    if (error) return res.status(500).json({ error: error.message })

    if (!currentOrder.pagamento_confirmado && data.pagamento_confirmado) {
      try {
        await sendPaymentConfirmedEmail(data)
      } catch (emailError) {
        console.error(emailError)
      }
    }

    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Método não permitido.' })
}

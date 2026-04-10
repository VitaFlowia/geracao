import { supabase } from '../../lib/supabaseClient'
import { ADMIN_PIN, calculatePricing, normalizePhone } from '../../lib/event'
import { sendOrderCreatedEmails } from '../../lib/email'

function generateId() {
  return `gr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function sanitizeParticipants(participants) {
  return (Array.isArray(participants) ? participants : [])
    .map((participant, index) => ({
      id: participant.id || `participante-${index + 1}`,
      name: String(participant.name || '').trim(),
      category: participant.category === 'adulto' ? 'adulto' : 'crianca',
    }))
    .filter((participant) => participant.name)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (req.headers['x-admin-pin'] !== ADMIN_PIN) {
      return res.status(401).json({ error: 'Acesso admin negado.' })
    }

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const buyerName = String(req.body.buyerName || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const phone = normalizePhone(req.body.phone)
    const participants = sanitizeParticipants(req.body.participants)
    const paymentMethod = req.body.paymentMethod === 'cartao_presencial' ? 'cartao_presencial' : 'pix'

    if (!buyerName || !email || !phone || participants.length === 0) {
      return res.status(400).json({ error: 'Dados obrigatorios incompletos.' })
    }

    const pricing = calculatePricing(participants, new Date())
    const nowIso = new Date().toISOString()
    const payload = {
      id: generateId(),
      buyer_name: buyerName,
      nome: buyerName,
      telefone: phone,
      email,
      participants,
      itens: participants,
      participant_count: pricing.participantCount,
      adult_count: pricing.adultCount,
      child_count: pricing.childCount,
      lot_name: pricing.lotName,
      lot_price: pricing.lotPrice,
      extra_people_count: pricing.extraPeopleCount,
      extra_people_fee: pricing.extraPeopleFee,
      amount_due: pricing.total,
      payment_method: paymentMethod,
      status: 'aguardando_pagamento',
      pagamento_confirmado: false,
      payment_confirmed_at: null,
      followup_count: 0,
      last_followup_sent_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const { data, error } = await supabase.from('pedidos').insert([payload]).select().single()

    if (error) return res.status(500).json({ error: error.message })

    try {
      await sendOrderCreatedEmails(data)
    } catch (emailError) {
      console.error(emailError)
    }

    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

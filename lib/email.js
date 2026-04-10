import {
  COMBO_EMAIL,
  EVENT_DATE_LABEL,
  EVENT_LOCATION,
  EVENT_SUBTITLE,
  EVENT_TITLE,
  PIX_KEY,
  SCHOOL_EMAIL,
  formatCurrency,
} from './event'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function participantsToHtml(order) {
  return order.participants
    .map(
      (participant) =>
        `<li style="margin-bottom:6px;"><strong>${participant.name}</strong> - ${participant.category}</li>`
    )
    .join('')
}

function wrapEmail(title, body) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f7f2e9;padding:24px;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8b6f3d;margin:0 0 8px;">${EVENT_TITLE}</p>
        <h1 style="font-size:28px;margin:0 0 12px;color:#15435f;">${title}</h1>
        ${body}
      </div>
    </div>
  `
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Geração Run <onboarding@resend.dev>'

  if (!apiKey) {
    return { skipped: true, reason: 'RESEND_API_KEY nao configurada' }
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      ...payload,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Falha ao enviar e-mail pelo Resend: ${errorText}`)
  }

  return response.json()
}

export async function sendOrderCreatedEmails(order) {
  const summaryHtml = `
    <p style="margin:0 0 16px;">Sua inscricao para o <strong>${EVENT_TITLE} - ${EVENT_SUBTITLE}</strong> foi registrada com sucesso.</p>
    <p style="margin:0 0 16px;"><strong>Data:</strong> ${EVENT_DATE_LABEL}<br /><strong>Local:</strong> ${EVENT_LOCATION}</p>
    <p style="margin:0 0 16px;"><strong>Responsavel:</strong> ${order.buyer_name}<br /><strong>Pagamento escolhido:</strong> ${order.payment_method}</p>
    <p style="margin:0 0 16px;"><strong>Total da familia:</strong> ${formatCurrency(order.amount_due)}</p>
    <ul style="padding-left:18px;margin:0 0 16px;">${participantsToHtml(order)}</ul>
    <p style="margin:0 0 16px;">Se a forma de pagamento escolhida foi PIX, utilize a chave <strong>${PIX_KEY}</strong> e envie o comprovante para o WhatsApp da secretaria.</p>
    <p style="margin:0;">Esta mensagem tambem foi encaminhada para <strong>${SCHOOL_EMAIL}</strong> e <strong>${COMBO_EMAIL}</strong>.</p>
  `

  return sendEmail({
    to: [order.email],
    bcc: [SCHOOL_EMAIL, COMBO_EMAIL],
    subject: `${EVENT_TITLE}: inscricao recebida para ${order.buyer_name}`,
    html: wrapEmail('Inscricao recebida com sucesso', summaryHtml),
  })
}

export async function sendPaymentConfirmedEmail(order) {
  const body = `
    <p style="margin:0 0 16px;">O pagamento da sua inscricao foi confirmado com sucesso.</p>
    <p style="margin:0 0 16px;">A Escola Geração do Saber agradece sua confianca em fortalecer o elo familiar e levar esse senso de familia da escola para dentro de casa.</p>
    <p style="margin:0 0 16px;"><strong>Total confirmado:</strong> ${formatCurrency(order.amount_due)}</p>
    <p style="margin:0;">Nos vemos em ${EVENT_DATE_LABEL}, na ${EVENT_LOCATION}.</p>
  `

  return sendEmail({
    to: [order.email],
    subject: `${EVENT_TITLE}: pagamento confirmado`,
    html: wrapEmail('Pagamento confirmado', body),
  })
}

export async function sendFollowupEmail(order) {
  const body = `
    <p style="margin:0 0 16px;">Estamos passando para lembrar com carinho da importancia da participacao de todos como uma familia neste grande encontro.</p>
    <p style="margin:0 0 16px;"><strong>Seu pedido ainda esta aguardando pagamento:</strong> ${formatCurrency(order.amount_due)}</p>
    <p style="margin:0 0 16px;">Se a opcao foi PIX, utilize a chave <strong>${PIX_KEY}</strong> e envie o comprovante para a secretaria. Se a opcao foi cartao, o pagamento acontece apenas presencialmente.</p>
    <p style="margin:0;">Estamos esperando sua familia para viver esse momento de afeto, movimento e memoria conosco.</p>
  `

  return sendEmail({
    to: [order.email],
    subject: `${EVENT_TITLE}: lembrete carinhoso da sua inscricao`,
    html: wrapEmail('Lembrete de pagamento', body),
  })
}

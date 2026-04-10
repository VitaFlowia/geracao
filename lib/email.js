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

function getBaseUrl() {
  const configuredUrl =
    process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || ''

  if (!configuredUrl) return ''
  if (configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')) return configuredUrl
  return `https://${configuredUrl}`
}

function getPublicAssetUrl(path) {
  const baseUrl = getBaseUrl()
  if (!baseUrl) return ''
  return `${baseUrl}${path}`
}

function categoryLabel(category) {
  return category === 'crianca' ? 'criança' : 'adulto'
}

function paymentLabel(method) {
  return method === 'pix' ? 'PIX' : 'Cartão de crédito (apenas presencial)'
}

function participantsToHtml(order) {
  return order.participants
    .map(
      (participant) =>
        `<li style="margin-bottom:6px;"><strong>${participant.name}</strong> - ${categoryLabel(participant.category)}</li>`
    )
    .join('')
}

function wrapEmail(title, body) {
  const bannerUrl = getPublicAssetUrl('/banner-menor.png')
  const schoolLogoUrl = getPublicAssetUrl('/logo-ger-saber.png')

  return `
    <div style="font-family:Arial,sans-serif;background:#f7f2e9;padding:24px;color:#1f2937;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;">
        ${bannerUrl
          ? `<img src="${bannerUrl}" alt="Banner do evento" style="display:block;width:100%;height:auto;" />`
          : ''}
        <div style="padding:32px 32px 44px;">
          <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8b6f3d;margin:0 0 8px;">${EVENT_TITLE}</p>
          <h1 style="font-size:28px;margin:0 0 12px;color:#15435f;">${title}</h1>
          ${body}
          ${schoolLogoUrl
            ? `<div style="text-align:center;margin-top:32px;">
                <img src="${schoolLogoUrl}" alt="Logo da Escola Geração do Saber" style="display:inline-block;max-width:180px;width:100%;height:auto;" />
              </div>`
            : ''}
        </div>
      </div>
    </div>
  `
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Geração Run <onboarding@resend.dev>'

  if (!apiKey) {
    return { skipped: true, reason: 'RESEND_API_KEY não configurada' }
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
    <p style="margin:0 0 16px;">Sua inscrição para o <strong>${EVENT_TITLE} - ${EVENT_SUBTITLE}</strong> foi registrada com sucesso.</p>
    <p style="margin:0 0 16px;"><strong>Data:</strong> ${EVENT_DATE_LABEL}<br /><strong>Local:</strong> ${EVENT_LOCATION}</p>
    <p style="margin:0 0 16px;"><strong>Responsável:</strong> ${order.buyer_name}<br /><strong>Pagamento escolhido:</strong> ${paymentLabel(order.payment_method)}</p>
    <p style="margin:0 0 16px;"><strong>Total da família:</strong> ${formatCurrency(order.amount_due)}</p>
    <ul style="padding-left:18px;margin:0 0 16px;">${participantsToHtml(order)}</ul>
    <p style="margin:0 0 16px;">Se a forma de pagamento escolhida foi PIX, utilize a chave <strong>${PIX_KEY}</strong> e envie o comprovante para o WhatsApp da secretaria.</p>
    <p style="margin:0;">Esta mensagem também foi encaminhada para <strong>${SCHOOL_EMAIL}</strong> e <strong>${COMBO_EMAIL}</strong>.</p>
  `

  return sendEmail({
    to: [order.email],
    bcc: [SCHOOL_EMAIL, COMBO_EMAIL],
    subject: `${EVENT_TITLE}: inscrição recebida para ${order.buyer_name}`,
    html: wrapEmail('Inscrição recebida com sucesso', summaryHtml),
  })
}

export async function sendPaymentConfirmedEmail(order) {
  const body = `
    <p style="margin:0 0 16px;">O pagamento da sua inscrição foi confirmado com sucesso.</p>
    <p style="margin:0 0 16px;">A Escola Geração do Saber agradece sua confiança em fortalecer o elo familiar e levar esse senso de família da escola para dentro de casa.</p>
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
    <p style="margin:0 0 16px;">Estamos passando para lembrar com carinho da importância da participação de todos como uma família neste grande encontro.</p>
    <p style="margin:0 0 16px;"><strong>Seu pedido ainda está aguardando pagamento:</strong> ${formatCurrency(order.amount_due)}</p>
    <p style="margin:0 0 16px;">Se a opção foi PIX, utilize a chave <strong>${PIX_KEY}</strong> e envie o comprovante para a secretaria. Se a opção foi cartão, o pagamento acontece apenas presencialmente.</p>
    <p style="margin:0;">Estamos esperando sua família para viver esse momento de afeto, movimento e memória conosco.</p>
  `

  return sendEmail({
    to: [order.email],
    subject: `${EVENT_TITLE}: lembrete carinhoso da sua inscrição`,
    html: wrapEmail('Lembrete de pagamento', body),
  })
}

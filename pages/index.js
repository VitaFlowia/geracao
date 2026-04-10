import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_PIN,
  CEO_WHATSAPP_LINK,
  EVENT_DATE_LABEL,
  EVENT_LOCATION,
  EVENT_SUBTITLE,
  EVENT_TITLE,
  INSTAGRAM_COMBO_URL,
  PIX_KEY,
  SCHOOL_EMAIL,
  calculatePricing,
  formatCurrency,
  getLotForDate,
  getTodayKey,
  normalizePhone,
} from '../lib/event'

const emptyParticipant = (index) => ({
  id: `participante-${index + 1}`,
  name: '',
  category: index === 0 ? 'adulto' : 'crianca',
})

const paymentCopy = {
  pix: {
    title: 'Seu pedido foi recebido com alegria',
    body: 'Agora basta concluir o PIX para garantir a participacao da sua familia nesse encontro cheio de afeto, movimento e conexao.',
  },
  cartao_presencial: {
    title: 'Obrigada por confiar na Escola Geração do Saber',
    body: 'Seguimos fortalecendo o elo familiar e estendendo da escola para a casa o senso de familia. Seu pedido ficou reservado para pagamento presencial no cartao de credito.',
  },
}

function initialForm() {
  return {
    buyerName: '',
    phone: '',
    email: '',
    participants: [emptyParticipant(0)],
    paymentMethod: 'pix',
  }
}

function paymentLabel(method) {
  return method === 'pix' ? 'PIX' : 'Cartao de credito (apenas presencial)'
}

function followupAvailable(lastSentAt) {
  if (!lastSentAt) return true
  return getTodayKey(new Date(lastSentAt)) !== getTodayKey(new Date())
}

function metricNumbers(orders) {
  const totalParticipants = orders.reduce((sum, order) => sum + Number(order.participant_count || 0), 0)
  const totalAdults = orders.reduce((sum, order) => sum + Number(order.adult_count || 0), 0)
  const totalChildren = orders.reduce((sum, order) => sum + Number(order.child_count || 0), 0)
  const paidOrders = orders.filter((order) => order.pagamento_confirmado).length
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.amount_due || 0), 0)
  const receivedRevenue = orders
    .filter((order) => order.pagamento_confirmado)
    .reduce((sum, order) => sum + Number(order.amount_due || 0), 0)

  return {
    totalOrders: orders.length,
    totalParticipants,
    totalAdults,
    totalChildren,
    paidOrders,
    pendingOrders: orders.length - paidOrders,
    totalRevenue,
    receivedRevenue,
    pendingRevenue: totalRevenue - receivedRevenue,
  }
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ModalShell({ children, onClose }) {
  return (
    <div className="modal-shell">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} type="button" aria-label="Fechar">
          x
        </button>
        {children}
      </div>
    </div>
  )
}

export default function Home() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [resultOrder, setResultOrder] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  const lot = useMemo(() => getLotForDate(new Date()), [])
  const pricing = useMemo(() => calculatePricing(form.participants, new Date()), [form.participants])
  const numbers = useMemo(() => metricNumbers(orders), [orders])
  const followupEligible = useMemo(
    () => orders.filter((order) => !order.pagamento_confirmado && followupAvailable(order.last_followup_sent_at)),
    [orders]
  )
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return orders
    return orders.filter((order) =>
      [order.buyer_name, order.email, order.telefone].some((value) => String(value || '').toLowerCase().includes(query))
    )
  }, [orders, search])

  useEffect(() => {
    if (!isAdmin) return
    loadOrders()
  }, [isAdmin])

  async function loadOrders() {
    try {
      setOrdersLoading(true)
      const response = await fetch('/api/pedidos', { headers: { 'x-admin-pin': ADMIN_PIN } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar pedidos.')
      setOrders(data)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateParticipant(index, field, value) {
    if (field === 'paymentMethod') {
      setForm((current) => ({ ...current, paymentMethod: value }))
      return
    }

    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [field]: value } : participant
      ),
    }))
  }

  function changeParticipantCount(direction) {
    setForm((current) => {
      const nextCount = Math.max(1, current.participants.length + direction)
      const participants = [...current.participants]
      if (nextCount > participants.length) {
        for (let index = participants.length; index < nextCount; index += 1) {
          participants.push(emptyParticipant(index))
        }
      } else {
        participants.length = nextCount
      }
      return { ...current, participants }
    })
  }

  function validateForm() {
    const nextErrors = {}
    if (!form.buyerName.trim()) nextErrors.buyerName = 'Informe o nome do responsavel.'
    if (!normalizePhone(form.phone)) nextErrors.phone = 'Informe um WhatsApp valido.'
    if (!form.email.trim()) nextErrors.email = 'O e-mail e obrigatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Informe um e-mail valido.'
    form.participants.forEach((participant, index) => {
      if (!participant.name.trim()) nextErrors[`participant-${index}`] = 'Informe o nome completo.'
    })
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submitOrder(event) {
    event.preventDefault()
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Nao foi possivel concluir a inscricao.')
      setResultOrder(data)
      setRegistrationOpen(false)
      setForm(initialForm())
      setErrors({})
      setNotice('')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePaid(order) {
    try {
      setAdminActionLoading(true)
      const response = await fetch(`/api/pedidos/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': ADMIN_PIN },
        body: JSON.stringify({ pagamento_confirmado: !order.pagamento_confirmado }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar pedido.')
      setOrders((current) => current.map((item) => (item.id === data.id ? data : item)))
      setNotice(data.pagamento_confirmado ? 'Pagamento confirmado e e-mail enviado ao cliente.' : 'Pedido voltou para pendente.')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setAdminActionLoading(false)
    }
  }

  async function sendFollowup() {
    try {
      setAdminActionLoading(true)
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': ADMIN_PIN },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Nao foi possivel enviar follow-up.')
      setNotice(data.message)
      await loadOrders()
    } catch (error) {
      setNotice(error.message)
    } finally {
      setAdminActionLoading(false)
    }
  }

  function openAdminArea() {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true)
      setAdminOpen(false)
      setPin('')
      setPinError('')
      return
    }
    setPinError('Senha incorreta.')
  }

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY)
    setNotice('Chave PIX copiada com sucesso.')
  }

  function generatePdf() {
    if (typeof window === 'undefined') return
    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) return

    const adults = orders.flatMap((order) =>
      order.participants.filter((participant) => participant.category === 'adulto').map((participant) => participant.name)
    )
    const children = orders.flatMap((order) =>
      order.participants.filter((participant) => participant.category === 'crianca').map((participant) => participant.name)
    )

    printWindow.document.write(`
      <html lang="pt-BR"><head><title>Relatorio Geração Run</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#1f2937}
        h1,h2,h3{margin:0 0 12px}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}
        .card{border:1px solid #d9d1c4;border-radius:16px;padding:16px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #d9d1c4;padding:10px;text-align:left;vertical-align:top}
        .list{columns:2;gap:24px}
      </style></head><body>
      <h1>${EVENT_TITLE}</h1><p>${EVENT_SUBTITLE}</p><p><strong>Data:</strong> ${EVENT_DATE_LABEL} | <strong>Local:</strong> ${EVENT_LOCATION}</p>
      <div class="grid">
        <div class="card"><strong>Inscricoes</strong><div>${numbers.totalOrders}</div></div>
        <div class="card"><strong>Participantes</strong><div>${numbers.totalParticipants}</div></div>
        <div class="card"><strong>Valor total</strong><div>${formatCurrency(numbers.totalRevenue)}</div></div>
        <div class="card"><strong>Adultos</strong><div>${numbers.totalAdults}</div></div>
        <div class="card"><strong>Criancas</strong><div>${numbers.totalChildren}</div></div>
        <div class="card"><strong>Pagos</strong><div>${numbers.paidOrders}</div></div>
        <div class="card"><strong>A pagar</strong><div>${numbers.pendingOrders}</div></div>
        <div class="card"><strong>Recebido</strong><div>${formatCurrency(numbers.receivedRevenue)}</div></div>
        <div class="card"><strong>Pendente</strong><div>${formatCurrency(numbers.pendingRevenue)}</div></div>
      </div>
      <h2>Pedidos</h2>
      <table><thead><tr><th>Responsavel</th><th>E-mail</th><th>Participantes</th><th>Pagamento</th><th>Status</th><th>Total</th></tr></thead><tbody>
      ${orders
        .map(
          (order) => `<tr><td>${order.buyer_name}</td><td>${order.email}</td><td>${order.participants
            .map((participant) => `${participant.name} (${participant.category})`)
            .join(', ')}</td><td>${paymentLabel(order.payment_method)}</td><td>${order.pagamento_confirmado ? 'Pago' : 'Pendente'}</td><td>${formatCurrency(order.amount_due)}</td></tr>`
        )
        .join('')}
      </tbody></table>
      <h3 style="margin-top:28px">Adultos</h3><div class="list">${adults.map((name) => `<div>${name}</div>`).join('')}</div>
      <h3 style="margin-top:20px">Criancas</h3><div class="list">${children.map((name) => `<div>${name}</div>`).join('')}</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <>
      <Head>
        <title>{EVENT_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Inscricoes do evento 1º Geração Run realizadas exclusivamente pelo site." />
        <link rel="icon" href="/favicon.png" />
      </Head>

      {registrationOpen ? (
        <ModalShell onClose={() => setRegistrationOpen(false)}>
          <div className="modal-banner"><img src="/banner-menor.png" alt="Banner do evento" /></div>
          <span className="eyebrow">Inscricoes exclusivamente pelo site</span>
          <h3>Garanta agora a vaga da sua familia</h3>
          <p className="modal-intro">Preencha os dados obrigatorios para receber a confirmacao por e-mail.</p>

          <form className="registration-form" onSubmit={submitOrder}>
            <section className="form-section">
              <div className="section-title-row"><div><span className="section-step">1</span><div><h4>Responsavel pela compra</h4><p>Nome, WhatsApp e e-mail sao obrigatorios.</p></div></div></div>
              <div className="field-grid">
                <label className="field"><span>Nome completo</span><input name="buyerName" value={form.buyerName} onChange={updateField} placeholder="Ex: Maria Helena Santos" />{errors.buyerName ? <small>{errors.buyerName}</small> : null}</label>
                <label className="field"><span>WhatsApp</span><input name="phone" value={form.phone} onChange={updateField} placeholder="(79) 99999-9999" />{errors.phone ? <small>{errors.phone}</small> : null}</label>
                <label className="field field-full"><span>E-mail para confirmacao</span><input name="email" type="email" value={form.email} onChange={updateField} placeholder="familia@email.com" />{errors.email ? <small>{errors.email}</small> : null}</label>
              </div>
            </section>

            <section className="form-section">
              <div className="section-title-row participants-row">
                <div><span className="section-step">2</span><div><h4>Quem vai participar</h4><p>Ao lado do nome, marque se e adulto ou crianca.</p></div></div>
                <div className="counter"><button type="button" onClick={() => changeParticipantCount(-1)}>-</button><strong>{form.participants.length}</strong><button type="button" onClick={() => changeParticipantCount(1)}>+</button></div>
              </div>
              <div className="participants-list">
                {form.participants.map((participant, index) => (
                  <div className="participant-card" key={participant.id}>
                    <label className="field"><span>Participante {String(index + 1).padStart(2, '0')}</span><input value={participant.name} onChange={(event) => updateParticipant(index, 'name', event.target.value)} placeholder="Nome completo" />{errors[`participant-${index}`] ? <small>{errors[`participant-${index}`]}</small> : null}</label>
                    <div className="category-toggle">
                      <button className={participant.category === 'adulto' ? 'active' : ''} type="button" onClick={() => updateParticipant(index, 'category', 'adulto')}>Adulto</button>
                      <button className={participant.category === 'crianca' ? 'active' : ''} type="button" onClick={() => updateParticipant(index, 'category', 'crianca')}>Crianca</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="section-title-row"><div><span className="section-step">3</span><div><h4>Como deseja pagar</h4><p>Escolha agora para receber a orientacao correta.</p></div></div></div>
              <div className="payment-grid">
                <button type="button" className={`payment-option ${form.paymentMethod === 'pix' ? 'active' : ''}`} onClick={() => updateParticipant(null, 'paymentMethod', 'pix')}><strong>PIX</strong><span>Recebe a chave e envia o comprovante.</span></button>
                <button type="button" className={`payment-option ${form.paymentMethod === 'cartao_presencial' ? 'active' : ''}`} onClick={() => updateParticipant(null, 'paymentMethod', 'cartao_presencial')}><strong>Cartao de credito</strong><span>Apenas presencial.</span></button>
              </div>
              <div className="warning-box"><strong>Observacao enfatizada:</strong> pagamento no cartao de credito acontece apenas presencialmente.</div>
            </section>

            <aside className="checkout-summary">
              <img src="/banner-menor.png" alt="Banner do pedido" />
              <span className="eyebrow">Resumo da inscricao</span>
              <h4>{lot.label}</h4>
              <p>R$ {lot.price},00 para ate 3 pessoas. Da quarta em diante, acrescenta R$ 25,00 por pessoa extra.</p>
              <div className="summary-grid">
                <div><span>Participantes</span><strong>{pricing.participantCount}</strong></div>
                <div><span>Adultos</span><strong>{pricing.adultCount}</strong></div>
                <div><span>Criancas</span><strong>{pricing.childCount}</strong></div>
                <div><span>Extras</span><strong>{pricing.extraPeopleCount}</strong></div>
              </div>
              <div className="price-breakdown">
                <div><span>Base do lote</span><strong>{formatCurrency(pricing.lotPrice)}</strong></div>
                <div><span>Adicional por extras</span><strong>{formatCurrency(pricing.extraPeopleFee)}</strong></div>
                <div className="total-line"><span>Total da familia</span><strong>{formatCurrency(pricing.total)}</strong></div>
              </div>
              <button className="primary-button full-width" disabled={submitting} type="submit">{submitting ? 'Enviando inscricao...' : 'Concluir inscricao'}</button>
            </aside>
          </form>
        </ModalShell>
      ) : null}

      {resultOrder ? (
        <ModalShell onClose={() => setResultOrder(null)}>
          <span className="eyebrow">Pedido concluido</span>
          <h3>{paymentCopy[resultOrder.payment_method].title}</h3>
          <p className="modal-intro">{paymentCopy[resultOrder.payment_method].body}</p>
          <div className="success-summary">
            <div><strong>Pedido</strong><span>{resultOrder.id}</span></div>
            <div><strong>Familia</strong><span>{resultOrder.participant_count} participante(s)</span></div>
            <div><strong>Total</strong><span>{formatCurrency(resultOrder.amount_due)}</span></div>
            <div><strong>Pagamento</strong><span>{paymentLabel(resultOrder.payment_method)}</span></div>
          </div>
          {resultOrder.payment_method === 'pix' ? (
            <div className="pix-box">
              <p className="pix-label">Chave PIX da escola</p>
              <strong>{PIX_KEY}</strong>
              <button className="gold-button" onClick={copyPix} type="button">Copiar chave PIX</button>
              <p className="pix-note">Para concretizar o pagamento, envie o comprovante do PIX para o WhatsApp da secretaria da escola.</p>
            </div>
          ) : (
            <div className="card-box">
              <p className="highlight-line">Pagamento no cartao sera realizado apenas presencialmente.</p>
              <p>A confirmacao tambem sera enviada para <strong>{resultOrder.email}</strong> assim que a equipe validar o pagamento.</p>
            </div>
          )}
          <p className="support-note">A confirmacao deste pedido foi enviada por e-mail para voce, para a secretaria e para a organizacao parceira.</p>
        </ModalShell>
      ) : null}

      {adminOpen ? (
        <ModalShell onClose={() => setAdminOpen(false)}>
          <span className="eyebrow">Area Admin</span>
          <h3>Digite a senha 250284</h3>
          <p className="modal-intro">Esta area controla pagamentos, dashboard, follow-up e relatorios.</p>
          <input className="admin-input" type="password" value={pin} onChange={(event) => { setPin(event.target.value); setPinError('') }} onKeyDown={(event) => { if (event.key === 'Enter') openAdminArea() }} placeholder="Senha admin" />
          {pinError ? <small className="error-line">{pinError}</small> : null}
          <button className="primary-button full-width" onClick={openAdminArea} type="button">Entrar no dashboard</button>
        </ModalShell>
      ) : null}

      <main className="page-shell">
        <header className="topbar">
          <div className="container nav-content">
            <div><span className="brand-label">{EVENT_TITLE}</span><strong>{EVENT_SUBTITLE}</strong></div>
            <nav className="top-actions">
              <a href="#inscricoes">Inscricoes</a>
              <a href="#combo">Combo das Estrelas</a>
              <button className="ghost-button" onClick={() => setAdminOpen(true)} type="button">Area Admin</button>
              <button className="primary-button" onClick={() => setRegistrationOpen(true)} type="button">Comprar inscricao</button>
            </nav>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-background" />
          <div className="hero-overlay" />
          <div className="container hero-content">
            <span className="hero-pill">O LEGADO CONTINUA</span>
            <div className="hero-copy">
              <p>Um encontro feito para celebrar o elo familiar, com inscricoes exclusivamente realizadas por este site.</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => setRegistrationOpen(true)} type="button">Garantir vaga da familia</button>
                <a className="ghost-light-button" href="#inscricoes">Ver lotes e regras</a>
              </div>
            </div>
          </div>
        </section>

        <section className="school-section">
          <div className="container school-grid">
            <div className="school-copy">
              <span className="eyebrow">Raizes que caminham</span>
              <h2>Uma experiencia pensada para fortalecer o senso de familia da escola para dentro de casa.</h2>
              <p>No dia <strong>{EVENT_DATE_LABEL}</strong>, na <strong>{EVENT_LOCATION}</strong>, cada passo sera um gesto de pertencimento, memoria e afeto compartilhado.</p>
            </div>
            <div className="school-logo-card"><img src="/logo-ger-saber.png" alt="Logomarca da Escola Geração do Saber" /></div>
          </div>
        </section>

        <section className="concept-section">
          <div className="container concept-grid">
            <article className="concept-card concept-large">
              <div><span className="eyebrow">Corrida consciente</span><h3>Movimento com proposito, acolhimento e memoria afetiva.</h3><p>O evento foi desenhado para familias inteiras viverem uma manha de praia, conexao e celebracao das pessoas que sustentam a nossa historia.</p></div>
              <img src="/banner-menor.png" alt="Banner menor do evento" />
            </article>
            <article className="concept-card"><span className="eyebrow">Inscricao digital</span><h3>Cadastro completo e confirmacao por e-mail.</h3><p>O pedido so e validado com os dados da familia, escolha do pagamento e registro do e-mail para confirmacao oficial.</p></article>
            <article className="concept-card highlight-card"><span className="eyebrow">Familia em foco</span><h3>Adultos e criancas participam com o mesmo protagonismo.</h3><p>No cadastro, cada nome e classificado como adulto ou crianca para um controle mais preciso da experiencia, dos kits e do dashboard.</p></article>
          </div>
        </section>

        <section className="details-strip">
          <div className="container strip-grid">
            <div><span>Data</span><strong>{EVENT_DATE_LABEL}</strong></div>
            <div><span>Horario</span><strong>07h as 10h</strong></div>
            <div><span>Local</span><strong>{EVENT_LOCATION}</strong></div>
          </div>
        </section>

        <section className="pricing-section" id="inscricoes">
          <div className="container pricing-grid">
            <div className="pricing-copy">
              <span className="eyebrow">Inscricoes abertas</span>
              <h2>Regras de lote claras para toda a familia</h2>
              <p>O valor do lote vale como total para ate 3 pessoas. Se for 1, 2 ou 3 participantes, o valor continua o mesmo. A partir da quarta pessoa, acrescenta <strong>R$ 25,00</strong> por participante extra.</p>
              <div className="lot-stack">
                <div className={`lot-card ${lot.id === 'primeiro' ? 'active' : ''}`}><div><strong>1º lote</strong><span>ate 22/04/2026</span></div><b>{formatCurrency(120)}</b></div>
                <div className={`lot-card ${lot.id === 'segundo' ? 'active' : ''}`}><div><strong>2º lote</strong><span>de 23/04/2026 ate 14/05/2026</span></div><b>{formatCurrency(150)}</b></div>
              </div>
              <div className="exclusive-note"><strong>Importante:</strong> as inscricoes serao realizadas exclusivamente pelo site.</div>
            </div>

            <aside className="checkout-panel">
              <img src="/banner-menor.png" alt="Banner da inscricao" />
              <span className="eyebrow">Cadastro e pedido</span>
              <h3>Compra guiada e segura</h3>
              <ul>
                <li>E-mail obrigatorio para envio da confirmacao.</li>
                <li>Participantes classificados como adulto ou crianca.</li>
                <li>Escolha entre PIX ou cartao de credito presencial.</li>
                <li>Pedido enviado tambem para a secretaria e para a organizacao.</li>
              </ul>
              <button className="primary-button full-width" onClick={() => setRegistrationOpen(true)} type="button">Abrir formulario de compra</button>
            </aside>
          </div>
        </section>

        <section className="combo-section" id="combo">
          <div className="container combo-grid">
            <div className="combo-copy">
              <span className="eyebrow">Combo das Estrelas</span>
              <h2>Transformando celebracoes em eventos memoraveis.</h2>
              <p>A <strong>Combo das Estrelas</strong> e uma empresa de eventos especializada em transformar celebracoes em experiencias marcantes e memoraveis. Somos especialistas em eventos escolares e em todos os tipos de eventos, como eventos esportivos, 15 anos, casamentos e projetos personalizados, desde a concepcao criativa ate a execucao completa.</p>
              <p>Planejamento autoral, operacao sensivel aos detalhes, impacto visual forte e uma conducao humana fazem parte da marca da empresa. Aqui, cada encontro nasce com estrategia, emocao e acabamento premium.</p>
              <p>Se voce quer viver o Geração do Saber com uma condicao especial e atendimento direto, este e o momento ideal para conversar.</p>
              <div className="combo-actions">
                <a className="gold-button" href={CEO_WHATSAPP_LINK} target="_blank" rel="noreferrer">Quero meu Desconto garantidos no Geração do Saber</a>
                <a className="instagram-link" href={INSTAGRAM_COMBO_URL} target="_blank" rel="noreferrer">@combodasestrelas</a>
              </div>
            </div>
            <div className="combo-card">
              <img src="/logo-combo-horizontal.png" alt="Logo Combo das Estrelas" />
              <div className="combo-quote"><strong>Atendimento direto com a CEO Amelhinha Sa</strong><p>Mais proximidade, mais clareza na condicao comercial e uma conversa que entende o valor de reunir familias em torno de um grande momento.</p></div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container footer-content">
            <div><span className="eyebrow">Realizacao</span><h3>{EVENT_TITLE}</h3><p>{EVENT_SUBTITLE}</p><p>Confirmacoes tambem pelo e-mail {SCHOOL_EMAIL}</p></div>
            <div className="footer-cranios"><img src="/logo-cranios-bottom.png" alt="Cranios" /></div>
          </div>
        </footer>

        {notice ? <div className="floating-notice">{notice}</div> : null}
      </main>

      {isAdmin ? (
        <section className="admin-shell">
          <div className="container admin-header">
            <div><span className="eyebrow">Dashboard admin</span><h2>Controle completo das inscricoes</h2><p>Senha configurada: 250284.</p></div>
            <div className="admin-actions">
              <button className="ghost-button" onClick={generatePdf} type="button">Gerar relatorio em PDF</button>
              <button className="gold-button" disabled={adminActionLoading || followupEligible.length === 0} onClick={sendFollowup} type="button">Enviar follow-up manual do dia ({followupEligible.length})</button>
            </div>
          </div>

          <div className="container admin-metrics">
            <MetricCard label="Inscricoes" value={numbers.totalOrders} />
            <MetricCard label="Participantes" value={numbers.totalParticipants} />
            <MetricCard label="Adultos" value={numbers.totalAdults} />
            <MetricCard label="Criancas" value={numbers.totalChildren} />
            <MetricCard label="Pagos" value={numbers.paidOrders} />
            <MetricCard label="A pagar" value={numbers.pendingOrders} />
            <MetricCard label="Recebido" value={formatCurrency(numbers.receivedRevenue)} />
            <MetricCard label="Pendente" value={formatCurrency(numbers.pendingRevenue)} />
          </div>

          <div className="container admin-panels">
            <div className="admin-panel">
              <div className="panel-head"><div><span className="eyebrow">Pendencias</span><h3>Quem ainda precisa pagar</h3></div></div>
              {numbers.pendingOrders === 0 ? <p>Todas as familias ja estao com o pagamento confirmado.</p> : (
                <ul className="name-list">
                  {orders.filter((order) => !order.pagamento_confirmado).map((order) => (
                    <li key={order.id}><strong>{order.buyer_name}</strong><span>{order.participant_count} participante(s) - {formatCurrency(order.amount_due)}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-panel">
              <div className="panel-head"><div><span className="eyebrow">Categorias</span><h3>Relacao por adulto e crianca</h3></div></div>
              <div className="category-columns">
                <div><strong>Adultos</strong><ul className="mini-list">{orders.flatMap((order) => order.participants.filter((participant) => participant.category === 'adulto')).map((participant, index) => <li key={`${participant.name}-${index}`}>{participant.name}</li>)}</ul></div>
                <div><strong>Criancas</strong><ul className="mini-list">{orders.flatMap((order) => order.participants.filter((participant) => participant.category === 'crianca')).map((participant, index) => <li key={`${participant.name}-${index}`}>{participant.name}</li>)}</ul></div>
              </div>
            </div>
          </div>

          <div className="container admin-order-list">
            <div className="panel-head">
              <div><span className="eyebrow">Pedidos</span><h3>Busca, confirmacao de pagamento e historico</h3></div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, email ou telefone" />
            </div>

            {ordersLoading ? <p>Carregando pedidos...</p> : filteredOrders.length === 0 ? <p>Nenhum pedido encontrado.</p> : (
              <div className="order-cards">
                {filteredOrders.map((order) => (
                  <article className={`order-card ${order.pagamento_confirmado ? 'paid' : ''}`} key={order.id}>
                    <div className="order-head">
                      <div><span className="order-id">{order.id}</span><h4>{order.buyer_name}</h4><p>{order.email} - {order.telefone}</p></div>
                      <div className="order-status"><span className={order.pagamento_confirmado ? 'paid-badge' : 'pending-badge'}>{order.pagamento_confirmado ? 'Pago' : 'Aguardando pagamento'}</span><strong>{formatCurrency(order.amount_due)}</strong></div>
                    </div>
                    <div className="order-meta">
                      <div><span>Lote</span><strong>{order.lot_name}</strong></div>
                      <div><span>Pagamento</span><strong>{paymentLabel(order.payment_method)}</strong></div>
                      <div><span>Follow-up</span><strong>{order.followup_count || 0}</strong></div>
                      <div><span>Status</span><strong>{order.status}</strong></div>
                    </div>
                    <ul className="participant-list">
                      {order.participants.map((participant) => <li key={`${order.id}-${participant.id}`}><strong>{participant.name}</strong><span>{participant.category}</span></li>)}
                    </ul>
                    <button className={`payment-confirm-button ${order.pagamento_confirmado ? 'is-paid' : ''}`} disabled={adminActionLoading} onClick={() => togglePaid(order)} type="button">{order.pagamento_confirmado ? 'Marcar como pendente novamente' : 'Confirmar pagamento e enviar e-mail'}</button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </>
  )
}

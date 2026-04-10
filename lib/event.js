export const EVENT_TITLE = '1º Geração Run'
export const EVENT_SUBTITLE = 'Raízes que Caminham'
export const EVENT_DATE_LABEL = '16 de maio de 2026'
export const EVENT_LOCATION = 'Praia de Atalaia'
export const SCHOOL_EMAIL = 'secretaria@gdosaber.com.br'
export const COMBO_EMAIL = 'combodasestrelas@gmail.com'
export const PIX_KEY = SCHOOL_EMAIL
export const EXTRA_PERSON_PRICE = 25
export const INSTAGRAM_COMBO_URL = 'https://www.instagram.com/combodasestrelas/'
export const CEO_WHATSAPP = '+5579991538303'
export const CEO_WHATSAPP_LINK =
  'https://wa.me/5579991538303?text=' +
  encodeURIComponent('Quero meu desconto garantido no Geração do Saber.')

export const LOTS = [
  {
    id: 'primeiro',
    label: '1º Lote',
    price: 120,
    deadline: '2026-04-22',
  },
  {
    id: 'segundo',
    label: '2º Lote',
    price: 150,
    deadline: '2026-05-14',
  },
]

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

export function getTodayKey(input) {
  const date = input instanceof Date ? input : new Date(input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getLotForDate(input) {
  const todayKey = getTodayKey(input)
  const currentLot = LOTS.find((lot) => todayKey <= lot.deadline)
  return currentLot || LOTS[LOTS.length - 1]
}

export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return ''
  return digits
}

export function calculatePricing(participants, inputDate) {
  const participantList = Array.isArray(participants) ? participants : []
  const participantCount = participantList.length
  const adultCount = participantList.filter((participant) => participant.category === 'adulto').length
  const childCount = participantList.filter((participant) => participant.category === 'crianca').length
  const lot = getLotForDate(inputDate)
  const extraPeopleCount = Math.max(0, participantCount - 3)
  const extraPeopleFee = extraPeopleCount * EXTRA_PERSON_PRICE
  const total = lot.price + extraPeopleFee

  return {
    lotId: lot.id,
    lotName: lot.label,
    lotPrice: lot.price,
    participantCount,
    adultCount,
    childCount,
    extraPeopleCount,
    extraPeopleFee,
    total,
  }
}

export function getAdminPin() {
  return String(process.env.ADMIN_PIN || '').trim()
}

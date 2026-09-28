const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,19}$/;
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const trimmed = (value) => String(value ?? '').trim();
const MAX_RECIPIENT_LENGTH = 120;

export function addCartLine(cart, line) {
  return [...cart, { ...line, lineId: line.lineId || crypto.randomUUID() }];
}

export function removeCartLine(cart, lineId) {
  return cart.filter((line) => line.lineId !== lineId);
}

export function removeSubmittedCartLines(cart, submittedCart) {
  const submittedIds = new Set(submittedCart.map((line) => line.lineId));
  return cart.filter((line) => !submittedIds.has(line.lineId));
}

export function cartTotalCents(cart) {
  return cart.reduce(
    (total, line) => total + Number(line.unitPriceCents) * Number(line.quantity),
    0,
  );
}

export function validateOrderContact(contact) {
  const errors = {};
  const name = trimmed(contact?.name);
  const email = trimmed(contact?.email);
  const phone = trimmed(contact?.phone);

  if (!name) errors.name = 'required';
  if (!email) errors.email = 'required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'invalid';
  if (!phone) errors.phone = 'required';
  else if (!PHONE_PATTERN.test(phone) || phone.replace(/\D/g, '').length < 6) errors.phone = 'invalid';
  if (contact?.privacyAccepted !== true) errors.privacyAccepted = 'required';

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCartRecipients(cart) {
  const errors = {};
  cart.forEach((line, index) => {
    const recipient = trimmed(line?.recipient);
    if (!recipient) errors[index] = 'required';
    else if (recipient.length > MAX_RECIPIENT_LENGTH) errors[index] = 'too_long';
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

export function orderPayloadFingerprint(payload) {
  const { p_idempotency_key: ignored, ...request } = payload;
  return JSON.stringify(request);
}

export function resolveIdempotencyKey(orderState, fingerprint, makeUuid = () => crypto.randomUUID()) {
  return orderState.failedFingerprint && orderState.failedFingerprint !== fingerprint
    ? makeUuid()
    : orderState.idempotencyKey;
}

export function safeHttpsUrl(value) {
  try {
    const url = new URL(trimmed(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function buildOrderPayload(contact, cart, idempotencyKey) {
  return {
    p_idempotency_key: idempotencyKey,
    p_customer_name: trimmed(contact?.name),
    p_customer_email: trimmed(contact?.email),
    p_customer_phone: trimmed(contact?.phone),
    p_member_reference: trimmed(contact?.memberReference),
    p_comments: trimmed(contact?.comments),
    p_page_lang: trimmed(contact?.pageLang) || 'es',
    p_items: cart.map((line) => ({
      variant_id: line.variantId,
      recipient: trimmed(line.recipient),
      quantity: line.quantity,
    })),
  };
}

export function campaignLabel(campaign) {
  const start = parseDate(campaign.period_start);
  const end = parseDate(campaign.period_end);
  const startYear = start.year === end.year ? '' : ` ${start.year}`;

  return `${start.day} ${MONTHS_ES[start.month - 1]}${startYear} - ${end.day} ${MONTHS_ES[end.month - 1]} ${end.year}`;
}

function parseDate(value) {
  const [year, month, day] = trimmed(value).split('-').map(Number);
  return { year, month, day };
}

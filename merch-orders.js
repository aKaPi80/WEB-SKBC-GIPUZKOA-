const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE_PATTERN = /^[+\d][\d\s().-]{5,19}$/;
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const trimmed = (value) => String(value ?? '').trim();

export function addCartLine(cart, line) {
  return [...cart, { ...line, lineId: line.lineId || crypto.randomUUID() }];
}

export function removeCartLine(cart, lineId) {
  return cart.filter((line) => line.lineId !== lineId);
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
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'invalid';
  if (contact?.privacyAccepted !== true) errors.privacyAccepted = 'required';

  return { valid: Object.keys(errors).length === 0, errors };
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

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCartLine,
  buildOrderPayload,
  campaignLabel,
  cartTotalCents,
  removeCartLine,
  validateOrderContact,
} from '../merch-orders.js';

test('equal articles remain separate family lines without mutating the cart', () => {
  const original = [];
  const first = addCartLine(original, {
    variantId: 'v1',
    recipient: 'Robert',
    quantity: 1,
    unitPriceCents: 4500,
  });
  const second = addCartLine(first, {
    variantId: 'v1',
    recipient: 'Robert',
    quantity: 1,
    unitPriceCents: 4500,
  });

  assert.deepEqual(original, []);
  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.notEqual(second[0].lineId, second[1].lineId);
  assert.equal(cartTotalCents(second), 9000);
});

test('removeCartLine removes only the matching line and returns a new cart', () => {
  const cart = [
    { lineId: 'line-1', variantId: 'v1' },
    { lineId: 'line-2', variantId: 'v1' },
  ];

  const next = removeCartLine(cart, 'line-1');

  assert.deepEqual(next, [{ lineId: 'line-2', variantId: 'v1' }]);
  assert.deepEqual(cart, [
    { lineId: 'line-1', variantId: 'v1' },
    { lineId: 'line-2', variantId: 'v1' },
  ]);
  assert.notEqual(next, cart);
});

test('cartTotalCents multiplies each informational unit price by its quantity', () => {
  assert.equal(cartTotalCents([
    { quantity: 2, unitPriceCents: 3000 },
    { quantity: 1, unitPriceCents: 500 },
  ]), 6500);
});

test('validateOrderContact reports required and malformed contact fields', () => {
  assert.deepEqual(validateOrderContact({
    name: ' ',
    email: 'invalid',
    phone: '',
    privacyAccepted: false,
  }), {
    valid: false,
    errors: {
      name: 'required',
      email: 'invalid',
      phone: 'required',
      privacyAccepted: 'required',
    },
  });

  assert.deepEqual(validateOrderContact({
    name: ' Aixa ',
    email: ' aixa@example.com ',
    phone: ' 600 000 000 ',
    privacyAccepted: true,
  }), { valid: true, errors: {} });
});

test('payload maps trimmed contact fields and never sends trusted prices or totals', () => {
  const payload = buildOrderPayload({
    name: ' Aixa ',
    email: ' aixa@example.com ',
    phone: ' 600000000 ',
    memberReference: ' K-12 ',
    comments: ' Sin bordado ',
    pageLang: 'eu',
    total: 999999,
  }, [{
    variantId: 'v1',
    recipient: ' Iraia ',
    quantity: 2,
    unitPriceCents: 1,
    lineTotalCents: 2,
  }], 'key');

  assert.deepEqual(payload, {
    p_idempotency_key: 'key',
    p_customer_name: 'Aixa',
    p_customer_email: 'aixa@example.com',
    p_customer_phone: '600000000',
    p_member_reference: 'K-12',
    p_comments: 'Sin bordado',
    p_page_lang: 'eu',
    p_items: [{ variant_id: 'v1', recipient: 'Iraia', quantity: 2 }],
  });
  assert.equal('total' in payload, false);
  assert.equal('unit_price_cents' in payload.p_items[0], false);
  assert.equal('line_total_cents' in payload.p_items[0], false);
});

test('campaignLabel renders the monthly campaign range in Spanish', () => {
  assert.equal(campaignLabel({
    period_start: '2026-09-16',
    period_end: '2026-10-15',
  }), '16 sep - 15 oct 2026');
});

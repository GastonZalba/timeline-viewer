import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDom, Timeline, CONTAINER_ID } from './helpers/dom.js';
import mockData from '../example/mock-data.js';

test('smoke: el componente monta y renderiza tarjetas', () => {
  const container = resetDom();
  const tl = new Timeline({ container, items: mockData.items, itemsPerPage: 5, featuredCount: 3 });
  const cards = container.querySelectorAll('.timeline-item');
  assert.ok(cards.length >= 5, `esperaba al menos 5 .timeline-item, hubo ${cards.length}`);
  assert.equal(tl.allCards.length, mockData.items.length);
});

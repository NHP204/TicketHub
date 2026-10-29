import { api } from './client.js';

export const EVENTS_PAGE_SIZE = 12;

// Danh sách sự kiện đã công bố. Trả { events, meta: { page, limit, total, totalPages } }.
export async function listEvents({ q, page = 1, limit = EVENTS_PAGE_SIZE } = {}) {
  const res = await api.get('/events', {
    params: { q: q || undefined, page, limit },
  });
  return { events: res.data.data, meta: res.data.meta };
}

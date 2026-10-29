import { api } from './client.js';

// Danh sách vé không kèm qrData; xem QR qua getTicket.
export async function listMyTickets() {
  const res = await api.get('/tickets/me');
  return res.data.data;
}

export async function getTicket(code) {
  const res = await api.get(`/tickets/${encodeURIComponent(code)}`);
  return res.data.data;
}

import { api } from './client.js';

// Giữ ghế. Trả booking PENDING kèm expiresAt và items.
export async function holdSeats({ eventId, seatIds }) {
  const res = await api.post('/bookings', { eventId, seatIds });
  return res.data.data;
}

// Booking kèm items: { id, status, eventId, totalAmount, expiresAt, items: [...] }.
export async function getBooking(id) {
  const res = await api.get(`/bookings/${id}`);
  return res.data.data;
}

// Thanh toán. Trả { booking, tickets }.
export async function payBooking(id) {
  const res = await api.post(`/bookings/${id}/pay`);
  return res.data.data;
}

export async function cancelBooking(id) {
  const res = await api.post(`/bookings/${id}/cancel`);
  return res.data.data;
}

// Booking của tôi, mới nhất trước. Trả { bookings, meta }.
export async function listMyBookings({ page = 1, limit = 10 } = {}) {
  const res = await api.get('/bookings/me', { params: { page, limit } });
  return { bookings: res.data.data, meta: res.data.meta };
}

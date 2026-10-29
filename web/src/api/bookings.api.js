import { api } from './client.js';

// Giữ ghế. Trả booking PENDING kèm expiresAt và items.
export async function holdSeats({ eventId, seatIds }) {
  const res = await api.post('/bookings', { eventId, seatIds });
  return res.data.data;
}

import { api } from './client.js';

// Sự kiện của organizer đang đăng nhập (mọi trạng thái).
export async function listMyEvents() {
  const res = await api.get('/organizer/events');
  return res.data.data;
}

// Số liệu theo sự kiện: [{ eventId, title, status, capacity, ticketsSold, revenue, fillRate }].
export async function listMyEventStats() {
  const res = await api.get('/organizer/stats');
  return res.data.data;
}

// fields: { title, description, venue, startTime, endTime } — thời gian là chuỗi ISO 8601.
export async function createEvent(fields) {
  const res = await api.post('/events', fields);
  return res.data.data;
}

export async function updateEvent(id, fields) {
  const res = await api.patch(`/events/${id}`, fields);
  return res.data.data;
}

export async function publishEvent(id) {
  const res = await api.post(`/events/${id}/publish`);
  return res.data.data;
}

export async function cancelEvent(id) {
  const res = await api.post(`/events/${id}/cancel`);
  return res.data.data;
}

// Gửi multipart với field "banner". Trả event đã cập nhật bannerUrl.
export async function uploadBanner(id, file) {
  const form = new FormData();
  form.append('banner', file);
  const res = await api.post(`/events/${id}/banner`, form);
  return res.data.data;
}

// section: { name, price, rowCount, seatsPerRow }.
export async function createSection(eventId, section) {
  const res = await api.post(`/events/${eventId}/sections`, section);
  return res.data.data;
}

export async function deleteSection(sectionId) {
  await api.delete(`/sections/${sectionId}`);
}

// Số liệu một sự kiện: { eventId, revenue, ticketsSold,
// sections: [{ name, price, capacity, sold, held, revenue, fillRate }] }.
export async function getEventStats(id) {
  const res = await api.get(`/organizer/events/${id}/stats`);
  return res.data.data;
}

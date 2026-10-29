// Doanh thu và số vé bán chỉ tính booking_items của booking PAID.
// COUNT trả bigint (pg đọc thành chuỗi) nên ép ::int; SUM ép ::bigint rồi Number() trong JS.
// fillRate: phần trăm làm tròn 1 chữ số, ép float8 để pg trả number.

// Sức chứa từng event: tổng row_count × seats_per_row của các section.
const CAPACITY_BY_EVENT = `
  SELECT event_id, SUM(row_count * seats_per_row)::int AS capacity
  FROM sections
  GROUP BY event_id`;

const SOLD_BY_EVENT = `
  SELECT b.event_id, COUNT(*)::int AS tickets_sold, SUM(bi.price)::bigint AS revenue
  FROM booking_items bi
  JOIN bookings b ON b.id = bi.booking_id
  WHERE b.status = 'PAID'
  GROUP BY b.event_id`;

// Mọi event của organizer, kể cả event chưa có section hoặc chưa bán vé; mới tạo trước.
export async function findOrganizerEventStats(db, organizerId) {
  const { rows } = await db.query(
    `SELECT e.id, e.title, e.status,
            COALESCE(c.capacity, 0) AS capacity,
            COALESCE(s.tickets_sold, 0) AS tickets_sold,
            COALESCE(s.revenue, 0) AS revenue,
            COALESCE(ROUND(s.tickets_sold * 100.0 / NULLIF(c.capacity, 0), 1), 0)::float8
              AS fill_rate
     FROM events e
     LEFT JOIN (${CAPACITY_BY_EVENT}) c ON c.event_id = e.id
     LEFT JOIN (${SOLD_BY_EVENT}) s ON s.event_id = e.id
     WHERE e.organizer_id = $1
     ORDER BY e.created_at DESC, e.id`,
    [organizerId],
  );
  return rows.map((row) => ({
    eventId: row.id,
    title: row.title,
    status: row.status,
    capacity: row.capacity,
    ticketsSold: row.tickets_sold,
    revenue: Number(row.revenue),
    fillRate: row.fill_rate,
  }));
}

// Từng section của event. held: ghế HELD còn hạn (như sơ đồ ghế, quá held_until coi là trống).
export async function findSectionStats(db, eventId) {
  const { rows } = await db.query(
    `SELECT sec.name, sec.price,
            sec.row_count * sec.seats_per_row AS capacity,
            COALESCE(sold.sold, 0) AS sold,
            COALESCE(h.held, 0) AS held,
            COALESCE(sold.revenue, 0) AS revenue,
            ROUND(COALESCE(sold.sold, 0) * 100.0 / (sec.row_count * sec.seats_per_row), 1)::float8
              AS fill_rate
     FROM sections sec
     LEFT JOIN (
       SELECT section_id,
              COUNT(*) FILTER (WHERE status = 'HELD' AND held_until >= now())::int AS held
       FROM seats
       WHERE event_id = $1
       GROUP BY section_id
     ) h ON h.section_id = sec.id
     LEFT JOIN (
       SELECT s.section_id, COUNT(*)::int AS sold, SUM(bi.price)::bigint AS revenue
       FROM booking_items bi
       JOIN bookings b ON b.id = bi.booking_id
       JOIN seats s ON s.id = bi.seat_id
       WHERE b.event_id = $1 AND b.status = 'PAID'
       GROUP BY s.section_id
     ) sold ON sold.section_id = sec.id
     WHERE sec.event_id = $1
     ORDER BY sec.name`,
    [eventId],
  );
  return rows.map((row) => ({
    name: row.name,
    price: row.price,
    capacity: row.capacity,
    sold: row.sold,
    held: row.held,
    revenue: Number(row.revenue),
    fillRate: row.fill_rate,
  }));
}

// Toàn hệ thống trong một câu lệnh.
export async function findAdminStats(db) {
  const { rows } = await db.query(
    `SELECT u.users_user, u.users_organizer, u.users_admin,
            e.events_draft, e.events_published, e.events_cancelled,
            s.total_revenue, s.tickets_sold
     FROM (
       SELECT COUNT(*) FILTER (WHERE role = 'USER')::int AS users_user,
              COUNT(*) FILTER (WHERE role = 'ORGANIZER')::int AS users_organizer,
              COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS users_admin
       FROM users
     ) u,
     (
       SELECT COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS events_draft,
              COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int AS events_published,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS events_cancelled
       FROM events
     ) e,
     (
       SELECT COALESCE(SUM(bi.price), 0)::bigint AS total_revenue,
              COUNT(bi.id)::int AS tickets_sold
       FROM booking_items bi
       JOIN bookings b ON b.id = bi.booking_id
       WHERE b.status = 'PAID'
     ) s`,
  );
  const row = rows[0];
  return {
    usersByRole: { USER: row.users_user, ORGANIZER: row.users_organizer, ADMIN: row.users_admin },
    events: {
      DRAFT: row.events_draft,
      PUBLISHED: row.events_published,
      CANCELLED: row.events_cancelled,
    },
    totalRevenue: Number(row.total_revenue),
    ticketsSold: row.tickets_sold,
  };
}

import { ForbiddenError, NotFoundError } from '../../errors/app-error.js';

// actor = { id, role } — người xem số liệu, lấy từ access token.
export class StatsService {
  constructor({ pool, eventRepo, statsRepo }) {
    this.pool = pool;
    this.eventRepo = eventRepo;
    this.statsRepo = statsRepo;
  }

  async listOrganizerStats(actor) {
    return this.statsRepo.findOrganizerEventStats(this.pool, actor.id);
  }

  // Chỉ chủ sự kiện xem được; tổng của event cộng từ các section (không query thêm).
  async getEventStats(actor, eventId) {
    const event = await this.eventRepo.findById(this.pool, eventId);
    if (!event) throw new NotFoundError('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện');
    if (event.organizerId !== actor.id) {
      throw new ForbiddenError('NOT_EVENT_OWNER', 'Bạn không phải chủ sự kiện này');
    }
    const sections = await this.statsRepo.findSectionStats(this.pool, eventId);
    return {
      eventId,
      revenue: sections.reduce((sum, s) => sum + s.revenue, 0),
      ticketsSold: sections.reduce((sum, s) => sum + s.sold, 0),
      sections,
    };
  }

  async getAdminStats() {
    return this.statsRepo.findAdminStats(this.pool);
  }
}

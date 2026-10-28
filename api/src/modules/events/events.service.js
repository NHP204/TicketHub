import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../config/db.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../errors/app-error.js';
import { BANNER_IMAGE_TYPES } from './events.schemas.js';

function eventNotFound() {
  return new NotFoundError('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện');
}

function notEventOwner() {
  return new ForbiddenError('NOT_EVENT_OWNER', 'Bạn không phải chủ sự kiện này');
}

function eventCancelled() {
  return new ConflictError('EVENT_CANCELLED', 'Sự kiện đã bị hủy');
}

function isOwner(event, actor) {
  return event.organizerId === actor.id;
}

// actor = { id, role } — người thực hiện thao tác, lấy từ access token.
export class EventService {
  // storage: { upload({ key, buffer, contentType }) → Promise<{ url }> }.
  constructor({ pool, eventRepo, seatRepo, storage, now = () => new Date() }) {
    this.pool = pool;
    this.eventRepo = eventRepo;
    this.seatRepo = seatRepo;
    this.storage = storage;
    this.now = now;
  }

  // startTime ở tương lai và endTime > startTime; sai → 400 VALIDATION_ERROR.
  assertValidSchedule(startTime, endTime) {
    const details = [];
    if (new Date(startTime) <= this.now()) {
      details.push({ path: 'startTime', message: 'startTime phải ở tương lai' });
    }
    if (new Date(endTime) <= new Date(startTime)) {
      details.push({ path: 'endTime', message: 'endTime phải sau startTime' });
    }
    if (details.length > 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Invalid request data', details);
    }
  }

  async listPublished({ q, from, to, sort, order, page, limit }) {
    const { events, total } = await this.eventRepo.findPublished(this.pool, {
      q,
      from,
      to,
      sort,
      order,
      limit,
      offset: (page - 1) * limit,
    });
    return { events, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async listMine(actor) {
    return this.eventRepo.findByOrganizer(this.pool, actor.id);
  }

  // actor có thể null (khách chưa đăng nhập). DRAFT/CANCELLED chỉ chủ sự kiện hoặc admin xem
  // được; người khác nhận 404 để không lộ sự tồn tại của sự kiện.
  async getById(actor, eventId) {
    const event = await this.eventRepo.findById(this.pool, eventId);
    if (!event) throw eventNotFound();
    if (event.status === 'PUBLISHED') return event;
    if (actor && (isOwner(event, actor) || actor.role === 'ADMIN')) return event;
    throw eventNotFound();
  }

  // Ai xem được event (theo getById) thì xem được sơ đồ ghế.
  async getSeatMap(actor, eventId) {
    await this.getById(actor, eventId);
    const sections = await this.seatRepo.findSeatMap(this.pool, eventId);
    return { eventId, sections };
  }

  async create(actor, { title, description, venue, startTime, endTime }) {
    this.assertValidSchedule(startTime, endTime);
    return this.eventRepo.create(this.pool, {
      organizerId: actor.id,
      title,
      description,
      venue,
      startTime,
      endTime,
    });
  }

  // Chỉ chủ sự kiện; sự kiện CANCELLED không sửa được.
  async update(actor, eventId, fields) {
    return withTransaction(this.pool, async (client) => {
      const event = await this.eventRepo.findByIdForUpdate(client, eventId);
      if (!event) throw eventNotFound();
      if (!isOwner(event, actor)) throw notEventOwner();
      if (event.status === 'CANCELLED') throw eventCancelled();

      if (fields.startTime !== undefined || fields.endTime !== undefined) {
        this.assertValidSchedule(
          fields.startTime ?? event.startTime,
          fields.endTime ?? event.endTime,
        );
      }
      return this.eventRepo.update(client, eventId, fields);
    });
  }

  // Chỉ chủ sự kiện, chỉ từ DRAFT, cần ít nhất một section.
  async publish(actor, eventId) {
    return withTransaction(this.pool, async (client) => {
      const event = await this.eventRepo.findByIdForUpdate(client, eventId);
      if (!event) throw eventNotFound();
      if (!isOwner(event, actor)) throw notEventOwner();
      if (event.status === 'CANCELLED') throw eventCancelled();
      if (event.status !== 'DRAFT') {
        throw new ConflictError('CONFLICT', 'Chỉ publish được sự kiện đang ở trạng thái DRAFT');
      }

      const sectionCount = await this.eventRepo.countSections(client, eventId);
      if (sectionCount === 0) {
        throw new ConflictError('EVENT_HAS_NO_SECTIONS', 'Sự kiện cần ít nhất một khu vực ghế');
      }
      return this.eventRepo.updateStatus(client, eventId, 'PUBLISHED');
    });
  }

  // Chỉ chủ sự kiện; sự kiện CANCELLED không đổi banner được. Kiểm tra quyền trước khi upload,
  // và không giữ transaction trong lúc gọi storage qua mạng. File banner cũ không bị xóa.
  async uploadBanner(actor, eventId, { buffer, contentType }) {
    const event = await this.eventRepo.findById(this.pool, eventId);
    if (!event) throw eventNotFound();
    if (!isOwner(event, actor)) throw notEventOwner();
    if (event.status === 'CANCELLED') throw eventCancelled();

    const key = `events/${eventId}/${randomUUID()}.${BANNER_IMAGE_TYPES[contentType]}`;
    const { url } = await this.storage.upload({ key, buffer, contentType });
    return this.eventRepo.updateBanner(this.pool, eventId, url);
  }

  // Chủ sự kiện hoặc admin.
  async cancel(actor, eventId) {
    return withTransaction(this.pool, async (client) => {
      const event = await this.eventRepo.findByIdForUpdate(client, eventId);
      if (!event) throw eventNotFound();
      if (!isOwner(event, actor) && actor.role !== 'ADMIN') throw notEventOwner();
      if (event.status === 'CANCELLED') throw eventCancelled();
      return this.eventRepo.updateStatus(client, eventId, 'CANCELLED');
    });
  }
}

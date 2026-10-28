import { withTransaction } from '../../config/db.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../errors/app-error.js';

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
  constructor({ pool, eventRepo, now = () => new Date() }) {
    this.pool = pool;
    this.eventRepo = eventRepo;
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

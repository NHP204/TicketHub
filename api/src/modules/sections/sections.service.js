import { withTransaction } from '../../config/db.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/app-error.js';

function eventNotFound() {
  return new NotFoundError('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện');
}

function sectionNotFound() {
  return new NotFoundError('SECTION_NOT_FOUND', 'Không tìm thấy khu vực');
}

function notEventOwner() {
  return new ForbiddenError('NOT_EVENT_OWNER', 'Bạn không phải chủ sự kiện này');
}

function eventCancelled() {
  return new ConflictError('EVENT_CANCELLED', 'Sự kiện đã bị hủy');
}

function sectionNameTaken() {
  return new ConflictError('SECTION_NAME_TAKEN', 'Tên khu vực đã tồn tại trong sự kiện');
}

// actor = { id, role } — người thực hiện thao tác, lấy từ access token.
// Mọi thao tác khóa dòng event (FOR UPDATE) trước, nên các thay đổi section của cùng
// một event chạy tuần tự và không chen ngang với cancel.
export class SectionService {
  constructor({ pool, eventRepo, sectionRepo, seatRepo }) {
    this.pool = pool;
    this.eventRepo = eventRepo;
    this.sectionRepo = sectionRepo;
    this.seatRepo = seatRepo;
  }

  // Event tồn tại, actor là chủ, chưa bị hủy.
  async lockOwnedEvent(client, actor, eventId) {
    const event = await this.eventRepo.findByIdForUpdate(client, eventId);
    if (!event) throw eventNotFound();
    if (event.organizerId !== actor.id) throw notEventOwner();
    if (event.status === 'CANCELLED') throw eventCancelled();
    return event;
  }

  // Section tồn tại và event của nó thỏa lockOwnedEvent.
  async lockOwnedSection(client, actor, sectionId) {
    const section = await this.sectionRepo.findById(client, sectionId);
    if (!section) throw sectionNotFound();
    await this.lockOwnedEvent(client, actor, section.eventId);
    return section;
  }

  // Tạo section và sinh rowCount × seatsPerRow ghế trong cùng một transaction.
  async create(actor, eventId, { name, price, rowCount, seatsPerRow }) {
    return withTransaction(this.pool, async (client) => {
      await this.lockOwnedEvent(client, actor, eventId);
      const section = await this.sectionRepo.create(client, {
        eventId,
        name,
        price,
        rowCount,
        seatsPerRow,
      });
      if (!section) throw sectionNameTaken();
      await this.seatRepo.generateForSection(client, {
        eventId,
        sectionId: section.id,
        rowCount,
        seatsPerRow,
      });
      return section;
    });
  }

  // Chỉ sửa name, price; số hàng/ghế cố định sau khi tạo.
  async update(actor, sectionId, { name, price }) {
    return withTransaction(this.pool, async (client) => {
      const section = await this.lockOwnedSection(client, actor, sectionId);
      if (name !== undefined) {
        const taken = await this.sectionRepo.existsByName(client, section.eventId, name, sectionId);
        if (taken) throw sectionNameTaken();
      }
      return this.sectionRepo.update(client, sectionId, { name, price });
    });
  }

  // Không xóa được khi còn ghế HELD hoặc BOOKED.
  async remove(actor, sectionId) {
    return withTransaction(this.pool, async (client) => {
      await this.lockOwnedSection(client, actor, sectionId);
      const unavailable = await this.seatRepo.countHeldOrBooked(client, sectionId);
      if (unavailable > 0) {
        throw new ConflictError('SECTION_HAS_BOOKINGS', 'Khu vực có ghế đang được giữ hoặc đã đặt');
      }
      await this.sectionRepo.remove(client, sectionId);
    });
  }
}

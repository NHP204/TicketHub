import { NotFoundError } from '../../errors/app-error.js';

export class TicketService {
  constructor({ pool, ticketRepo }) {
    this.pool = pool;
    this.ticketRepo = ticketRepo;
  }

  // Danh sách không kèm qrData (mỗi ảnh vài KB); xem từng vé qua getByCode.
  async listMine(actor) {
    return this.ticketRepo.findByUser(this.pool, actor.id);
  }

  // Chỉ chủ vé xem được; người khác nhận 404 để không lộ mã vé có tồn tại.
  async getByCode(actor, code) {
    const found = await this.ticketRepo.findByCode(this.pool, code);
    if (!found || found.userId !== actor.id) {
      throw new NotFoundError('TICKET_NOT_FOUND', 'Không tìm thấy vé');
    }
    return found.ticket;
  }
}

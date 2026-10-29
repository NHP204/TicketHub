import { expireAndReleaseSeats } from '../repositories/booking.repo.js';

// Chuyển booking PENDING quá hạn sang EXPIRED và trả ghế của chúng.
// Trả về { bookings, seats }: số booking đã hết hạn và số ghế đã trả.
export async function releaseExpired(pool) {
  return expireAndReleaseSeats(pool);
}

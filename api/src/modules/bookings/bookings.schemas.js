import { z } from 'zod';
import { MAX_SEATS_PER_BOOKING } from '../../config/constants.js';

function isUnique(values) {
  return new Set(values).size === values.length;
}

export const holdSeatsSchema = z.object({
  eventId: z.uuid(),
  seatIds: z
    .array(z.uuid())
    .min(1)
    .max(MAX_SEATS_PER_BOOKING)
    .refine(isUnique, { message: 'Danh sách ghế bị trùng' }),
});

const MAX_PAGE_SIZE = 50;

const BOOKING_STATUSES = ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'];

export const listMyBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

export const bookingIdParamsSchema = z.object({
  id: z.uuid(),
});

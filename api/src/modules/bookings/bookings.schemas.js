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

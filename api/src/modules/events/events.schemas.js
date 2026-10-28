import { z } from 'zod';

// Quy tắc thời gian (startTime ở tương lai, endTime > startTime) nằm ở EventService,
// vì khi PATCH một phần phải so với giá trị đang lưu.
const eventFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  venue: z.string().trim().min(1).max(200),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
};

function hasAnyField(value) {
  return Object.values(value).some((v) => v !== undefined);
}

export const createEventSchema = z.object(eventFields);

export const updateEventSchema = z
  .object(Object.fromEntries(Object.entries(eventFields).map(([k, s]) => [k, s.optional()])))
  .refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const eventIdParamsSchema = z.object({
  id: z.uuid(),
});

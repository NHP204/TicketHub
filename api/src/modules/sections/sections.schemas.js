import { z } from 'zod';

// Giới hạn của cột INTEGER trong PostgreSQL.
const MAX_INTEGER = 2_147_483_647;

const name = z.string().trim().min(1).max(50);
const price = z.number().int().min(0).max(MAX_INTEGER);

function hasAnyField(value) {
  return Object.values(value).some((v) => v !== undefined);
}

// Nhãn hàng là một chữ cái A–Z nên tối đa 26 hàng.
export const createSectionSchema = z.object({
  name,
  price,
  rowCount: z.number().int().min(1).max(26),
  seatsPerRow: z.number().int().min(1).max(50),
});

// rowCount/seatsPerRow không sửa được: strict để báo lỗi thay vì lặng lẽ bỏ qua.
export const updateSectionSchema = z
  .strictObject({ name: name.optional(), price: price.optional() })
  .refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

export const sectionIdParamsSchema = z.object({
  id: z.uuid(),
});

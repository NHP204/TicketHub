import { z } from 'zod';
import { passwordSchema } from '../auth/auth.schemas.js';

const ROLES = ['USER', 'ORGANIZER', 'ADMIN'];
const MAX_PAGE_SIZE = 50;

function hasAnyField(value) {
  return Object.values(value).some((v) => v !== undefined);
}

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' })
  .refine((v) => (v.currentPassword === undefined) === (v.newPassword === undefined), {
    message: 'Đổi mật khẩu cần cả currentPassword và newPassword',
    path: ['currentPassword'],
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
  role: z.enum(ROLES).optional(),
});

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(hasAnyField, { message: 'Cần ít nhất một trường để cập nhật' });

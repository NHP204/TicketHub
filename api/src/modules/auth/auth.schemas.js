import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().max(255).pipe(z.email()),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/\p{L}/u, 'Mật khẩu phải có ít nhất một chữ cái')
    .regex(/\d/, 'Mật khẩu phải có ít nhất một chữ số'),
  fullName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(72),
});

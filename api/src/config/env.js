import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Chỉ liệt kê tên biến và lý do, không bao giờ in giá trị (có thể là secret).
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables: ${problems.join('; ')}`);
  }
  return result.data;
}

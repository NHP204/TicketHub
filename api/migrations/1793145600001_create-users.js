export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ORGANIZER', 'ADMIN')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT users_email_key UNIQUE (email)
    );

    CREATE TABLE refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ NULL,
      replaced_by UUID NULL REFERENCES refresh_tokens (id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash)
    );
  `);
};

// Giữ extension pgcrypto khi down: nó có thể đã có sẵn trước migration (ví dụ trên Supabase).
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE refresh_tokens;
    DROP TABLE users;
  `);
};

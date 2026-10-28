export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users (id),
      event_id UUID NOT NULL REFERENCES events (id),
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
      total_amount INTEGER NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX bookings_user_id_created_at_idx ON bookings (user_id, created_at);
    CREATE INDEX bookings_expires_at_idx ON bookings (expires_at) WHERE status = 'PENDING';

    CREATE TABLE booking_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
      seat_id UUID NOT NULL REFERENCES seats (id),
      price INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT booking_items_booking_id_seat_id_key UNIQUE (booking_id, seat_id)
    );

    CREATE TABLE tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_item_id UUID NOT NULL REFERENCES booking_items (id),
      code VARCHAR(20) NOT NULL,
      qr_data TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'VALID'
        CHECK (status IN ('VALID', 'USED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT tickets_code_key UNIQUE (code),
      CONSTRAINT tickets_booking_item_id_key UNIQUE (booking_item_id)
    );

    CREATE TABLE payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL REFERENCES bookings (id),
      provider VARCHAR(30) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
      transaction_ref VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT payments_booking_id_key UNIQUE (booking_id),
      CONSTRAINT payments_transaction_ref_key UNIQUE (transaction_ref)
    );
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE payments;
    DROP TABLE tickets;
    DROP TABLE booking_items;
    DROP TABLE bookings;
  `);
};

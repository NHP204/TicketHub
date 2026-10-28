export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organizer_id UUID NOT NULL REFERENCES users (id),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      venue VARCHAR(200) NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      banner_url TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT events_time_check CHECK (end_time > start_time)
    );

    CREATE INDEX events_status_start_time_idx ON events (status, start_time);

    CREATE TABLE sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      row_count INTEGER NOT NULL CHECK (row_count BETWEEN 1 AND 26),
      seats_per_row INTEGER NOT NULL CHECK (seats_per_row BETWEEN 1 AND 50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT sections_event_id_name_key UNIQUE (event_id, name)
    );

    CREATE TABLE seats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
      section_id UUID NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
      row_label VARCHAR(2) NOT NULL,
      seat_number INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
      held_by UUID NULL REFERENCES users (id),
      held_until TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT seats_section_row_number_key UNIQUE (section_id, row_label, seat_number),
      CONSTRAINT seats_held_until_check CHECK (status <> 'HELD' OR held_until IS NOT NULL)
    );

    CREATE INDEX seats_event_id_status_idx ON seats (event_id, status);
    CREATE INDEX seats_held_until_idx ON seats (held_until) WHERE status = 'HELD';
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE seats;
    DROP TABLE sections;
    DROP TABLE events;
  `);
};

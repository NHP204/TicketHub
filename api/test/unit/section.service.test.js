import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SectionService } from '../../src/modules/sections/sections.service.js';

// Pool giả cho withTransaction: client không làm gì với BEGIN/COMMIT/ROLLBACK.
const fakePool = {
  async connect() {
    return { async query() {}, release() {} };
  },
};

function createFakeEventRepo(events) {
  return {
    async findByIdForUpdate(_db, id) {
      const event = events.find((e) => e.id === id);
      return event ? { ...event } : null;
    },
  };
}

// Repo giả ghi lại section và ghế đã tạo vào mảng truyền vào.
function createFakeSectionRepo(created) {
  return {
    async create(_db, data) {
      const section = { id: `section-${created.length + 1}`, ...data };
      created.push(section);
      return { ...section };
    },
  };
}

function createFakeSeatRepo(generated) {
  return {
    async generateForSection(_db, data) {
      generated.push(data);
      return data.rowCount * data.seatsPerRow;
    },
  };
}

const organizerA = { id: 'organizer-a', role: 'ORGANIZER' };
const organizerB = { id: 'organizer-b', role: 'ORGANIZER' };

const vipSection = { name: 'VIP', price: 500000, rowCount: 2, seatsPerRow: 10 };

test('organizer B tạo section trong sự kiện của organizer A thì ném lỗi NOT_EVENT_OWNER', async () => {
  const service = new SectionService({
    pool: fakePool,
    eventRepo: createFakeEventRepo([
      { id: 'event-1', organizerId: organizerA.id, status: 'DRAFT' },
    ]),
    sectionRepo: createFakeSectionRepo([]),
    seatRepo: createFakeSeatRepo([]),
  });
  await assert.rejects(service.create(organizerB, 'event-1', vipSection), {
    code: 'NOT_EVENT_OWNER',
  });
});

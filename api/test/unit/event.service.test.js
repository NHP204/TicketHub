import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventService } from '../../src/modules/events/events.service.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');

// Pool giả cho withTransaction: client không làm gì với BEGIN/COMMIT/ROLLBACK.
const fakePool = {
  async connect() {
    return { async query() {}, release() {} };
  },
};

// Repo giả lưu sự kiện trong mảng; sectionCounts: eventId → số section.
function createFakeEventRepo(initialEvents = [], sectionCounts = {}) {
  const events = initialEvents.map((e) => ({ ...e }));
  const find = async (_db, id) => {
    const event = events.find((e) => e.id === id);
    return event ? { ...event } : null;
  };
  return {
    findById: find,
    findByIdForUpdate: find,
    async create(_db, data) {
      const event = { id: `event-${events.length + 1}`, status: 'DRAFT', ...data };
      events.push(event);
      return { ...event };
    },
    async update(_db, id, fields) {
      const event = events.find((e) => e.id === id);
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) event[key] = value;
      }
      return { ...event };
    },
    async updateStatus(_db, id, status) {
      const event = events.find((e) => e.id === id);
      event.status = status;
      return { ...event };
    },
    async countSections(_db, eventId) {
      return sectionCounts[eventId] ?? 0;
    },
  };
}

function createService(eventRepo) {
  return new EventService({ pool: fakePool, eventRepo, now: () => NOW });
}

const organizerA = { id: 'organizer-a', role: 'ORGANIZER' };
const organizerB = { id: 'organizer-b', role: 'ORGANIZER' };
const admin = { id: 'admin-1', role: 'ADMIN' };

function eventOf(organizer, overrides = {}) {
  return {
    id: 'event-1',
    organizerId: organizer.id,
    title: 'Đêm nhạc Jazz',
    description: 'Mô tả',
    venue: 'Nhà hát lớn',
    startTime: '2026-07-01T12:00:00.000Z',
    endTime: '2026-07-01T15:00:00.000Z',
    status: 'DRAFT',
    ...overrides,
  };
}

test('organizer A sửa sự kiện của organizer B thì ném lỗi NOT_EVENT_OWNER', async () => {
  const service = createService(createFakeEventRepo([eventOf(organizerB)]));
  await assert.rejects(service.update(organizerA, 'event-1', { title: 'Tên mới' }), {
    code: 'NOT_EVENT_OWNER',
  });
});

test('admin cancel sự kiện của organizer A thì sự kiện chuyển sang CANCELLED', async () => {
  const service = createService(
    createFakeEventRepo([eventOf(organizerA, { status: 'PUBLISHED' })]),
  );
  const event = await service.cancel(admin, 'event-1');
  assert.equal(event.status, 'CANCELLED');
});

test('sửa sự kiện CANCELLED thì ném lỗi EVENT_CANCELLED', async () => {
  const service = createService(
    createFakeEventRepo([eventOf(organizerA, { status: 'CANCELLED' })]),
  );
  await assert.rejects(service.update(organizerA, 'event-1', { title: 'Tên mới' }), {
    code: 'EVENT_CANCELLED',
  });
});

test('publish sự kiện chưa có section thì ném lỗi EVENT_HAS_NO_SECTIONS', async () => {
  const service = createService(createFakeEventRepo([eventOf(organizerA)], { 'event-1': 0 }));
  await assert.rejects(service.publish(organizerA, 'event-1'), {
    code: 'EVENT_HAS_NO_SECTIONS',
  });
});

test('publish sự kiện DRAFT có section thì sự kiện chuyển sang PUBLISHED', async () => {
  const service = createService(createFakeEventRepo([eventOf(organizerA)], { 'event-1': 2 }));
  const event = await service.publish(organizerA, 'event-1');
  assert.equal(event.status, 'PUBLISHED');
});

test('organizer B cancel sự kiện của organizer A thì ném lỗi NOT_EVENT_OWNER', async () => {
  const service = createService(createFakeEventRepo([eventOf(organizerA)]));
  await assert.rejects(service.cancel(organizerB, 'event-1'), { code: 'NOT_EVENT_OWNER' });
});

test('sửa sự kiện không tồn tại thì ném lỗi EVENT_NOT_FOUND', async () => {
  const service = createService(createFakeEventRepo());
  await assert.rejects(service.update(organizerA, 'khong-co', { title: 'Tên mới' }), {
    code: 'EVENT_NOT_FOUND',
  });
});

test('tạo sự kiện thì sự kiện ở trạng thái DRAFT và thuộc về người tạo', async () => {
  const service = createService(createFakeEventRepo());
  const event = await service.create(organizerA, {
    title: 'Đêm nhạc Jazz',
    description: 'Mô tả',
    venue: 'Nhà hát lớn',
    startTime: '2026-07-01T12:00:00.000Z',
    endTime: '2026-07-01T15:00:00.000Z',
  });
  assert.deepEqual(
    { status: event.status, organizerId: event.organizerId },
    { status: 'DRAFT', organizerId: 'organizer-a' },
  );
});

test('tạo sự kiện có startTime trong quá khứ thì ném lỗi VALIDATION_ERROR', async () => {
  const service = createService(createFakeEventRepo());
  await assert.rejects(
    service.create(organizerA, {
      title: 'Đêm nhạc Jazz',
      description: 'Mô tả',
      venue: 'Nhà hát lớn',
      startTime: '2026-05-31T12:00:00.000Z',
      endTime: '2026-07-01T15:00:00.000Z',
    }),
    { code: 'VALIDATION_ERROR' },
  );
});

test('sửa chỉ endTime sớm hơn startTime đang lưu thì ném lỗi VALIDATION_ERROR', async () => {
  const service = createService(createFakeEventRepo([eventOf(organizerA)]));
  await assert.rejects(
    service.update(organizerA, 'event-1', { endTime: '2026-07-01T11:00:00.000Z' }),
    { code: 'VALIDATION_ERROR' },
  );
});

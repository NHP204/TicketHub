import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import EventSchedule from './EventSchedule.jsx';

function event(id, title, startTime) {
  return { id, title, venue: 'Nhà hát Lớn', startTime, bannerUrl: null };
}

// Mốc "bây giờ" cố định: 10/11/2099 theo giờ Việt Nam.
const NOW = new Date('2099-11-10T03:00:00Z');

function renderSchedule(events) {
  render(
    <MemoryRouter>
      <EventSchedule events={events} now={NOW} />
    </MemoryRouter>,
  );
}

describe('EventSchedule', () => {
  afterEach(cleanup);

  it('nhóm theo tháng, tháng cùng năm với now chỉ ghi "Tháng 11"', () => {
    renderSchedule([
      event('e1', 'Đêm nhạc Jazz', '2099-11-28T13:00:00Z'),
      event('e2', 'Hòa nhạc mùa đông', '2099-11-29T07:12:00Z'),
    ]);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Tháng 11');
    const month = screen.getByRole('region', { name: 'Tháng 11' });
    expect(within(month).getAllByRole('listitem')).toHaveLength(2);
  });

  it('tháng khác năm với now thì thêm năm: "Tháng 1, 2100"', () => {
    renderSchedule([
      event('e1', 'Đêm nhạc Jazz', '2099-11-28T13:00:00Z'),
      // 31/12/2099 17:30 UTC là 01/01/2100 00:30 giờ Việt Nam.
      event('e2', 'Chào năm mới', '2099-12-31T17:30:00Z'),
    ]);

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Tháng 11', 'Tháng 1, 2100']);
  });

  it('cột ngày có chữ ẩn là ngày giờ đầy đủ, số ngày và thứ viết tắt bị ẩn khỏi trình đọc', () => {
    renderSchedule([event('e1', 'Đêm nhạc Jazz', '2099-11-28T13:00:00Z')]);

    const time = document.querySelector('time[datetime="2099-11-28T13:00:00Z"]');
    // 28/11/2099 là Thứ Bảy; 13:00 UTC là 20:00 giờ Việt Nam.
    expect(within(time).getByText('Thứ Bảy, 28/11/2099, 20:00').className).toContain('sr-only');
    expect(within(time).getByText('28').getAttribute('aria-hidden')).toBe('true');
    expect(within(time).getByText('T7').getAttribute('aria-hidden')).toBe('true');
  });
});

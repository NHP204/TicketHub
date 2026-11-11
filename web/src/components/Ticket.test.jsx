import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Ticket from './Ticket.jsx';

const event = {
  title: 'Đêm nhạc Jazz',
  venue: 'Nhà hát Lớn',
  startTime: '2026-11-28T13:00:00Z',
};

describe('Ticket', () => {
  afterEach(cleanup);

  it('mã ghế lớn ghép hàng và số: hàng A, số 12 → "A12"', () => {
    render(<Ticket event={event} section="VIP" row="A" number={12} code="TH-K7Q2" />);

    expect(screen.getByText('A12')).toBeTruthy();
  });

  it('có qrData → ảnh QR có alt chứa mã vé', () => {
    render(
      <Ticket
        event={event}
        section="VIP"
        row="A"
        number={12}
        code="TH-K7Q2"
        qrData="data:image/png;base64,AAA"
      />,
    );

    expect(screen.getByRole('img', { name: 'Mã QR vé TH-K7Q2' })).toBeTruthy();
  });

  it('xem trước (chưa có mã vé, chưa có QR) → hiện "QR có sau khi thanh toán"', () => {
    render(<Ticket event={event} section="VIP" row="A" number={12} />);

    expect(screen.getByText('QR có sau khi thanh toán')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});

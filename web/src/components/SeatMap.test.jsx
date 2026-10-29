import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SeatMap from './SeatMap.jsx';

function seat(id, number, status = 'AVAILABLE') {
  return { id, number, status };
}

const sections = [
  {
    id: 'sec-vip',
    name: 'VIP',
    price: 500000,
    rows: [
      {
        label: 'A',
        seats: [
          seat('a1', 1),
          seat('a2', 2),
          seat('a3', 3, 'BOOKED'),
          seat('a4', 4, 'HELD'),
          seat('a5', 5),
          seat('a6', 6),
          seat('a7', 7),
          seat('a8', 8),
        ],
      },
    ],
  },
];

function renderSeatMap(props = {}) {
  const onToggle = vi.fn();
  const utils = render(
    <SeatMap sections={sections} selectedIds={[]} onToggle={onToggle} {...props} />,
  );
  return { ...utils, onToggle };
}

describe('SeatMap', () => {
  afterEach(cleanup);

  it('click ghế AVAILABLE → onToggle nhận đúng id', () => {
    const { onToggle } = renderSeatMap();

    fireEvent.click(screen.getByRole('button', { name: 'VIP hàng A ghế 2, 500.000 đ' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('a2');
  });

  it('ghế BOOKED có disabled, click không gọi onToggle', () => {
    const { onToggle } = renderSeatMap();
    const booked = screen.getByRole('button', { name: 'VIP hàng A ghế 3, 500.000 đ' });

    fireEvent.click(booked);

    expect(booked.disabled).toBe(true);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('đã chọn 6 ghế → ghế thứ 7 bị disabled', () => {
    renderSeatMap({ selectedIds: ['a1', 'a2', 'a5', 'a6', 'a7', 'x-other'] });

    const seventh = screen.getByRole('button', { name: 'VIP hàng A ghế 8, 500.000 đ' });
    const selected = screen.getByRole('button', { name: 'VIP hàng A ghế 1, 500.000 đ' });

    expect(seventh.disabled).toBe(true);
    expect(selected.disabled).toBe(false);
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('click vào khoảng trống giữa các ghế → không gọi onToggle', () => {
    const { onToggle } = renderSeatMap();
    const row = screen.getByRole('button', { name: 'VIP hàng A ghế 1, 500.000 đ' }).parentElement;

    fireEvent.click(row);

    expect(onToggle).not.toHaveBeenCalled();
  });
});

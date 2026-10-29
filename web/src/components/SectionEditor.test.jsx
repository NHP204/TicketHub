import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SectionEditor from './SectionEditor.jsx';

describe('SectionEditor', () => {
  afterEach(cleanup);

  it('10 hàng × 20 ghế → hiện "Sẽ tạo 200 ghế"', () => {
    render(<SectionEditor onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Số hàng'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Số ghế mỗi hàng'), { target: { value: '20' } });

    expect(screen.getByText('Sẽ tạo 200 ghế')).toBeTruthy();
  });
});

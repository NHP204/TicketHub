import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BannerUpload from './BannerUpload.jsx';

describe('BannerUpload', () => {
  afterEach(cleanup);

  it('file 3 MB → hiện lỗi, không gọi API', () => {
    const onUpload = vi.fn();
    render(<BannerUpload onUpload={onUpload} />);

    const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'banner.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Chọn ảnh banner'), { target: { files: [bigFile] } });

    expect(screen.getByRole('alert').textContent).toBe(
      'Ảnh vượt quá 2 MB, vui lòng chọn ảnh nhỏ hơn.',
    );
    expect(screen.queryByRole('button', { name: 'Tải lên' })).toBeNull();
    expect(onUpload).not.toHaveBeenCalled();
  });
});

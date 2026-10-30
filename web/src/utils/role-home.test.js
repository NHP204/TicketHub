import { describe, expect, it } from 'vitest';
import { canVisit, landingPath, roleHome } from './role-home.js';

describe('roleHome', () => {
  it("roleHome('ORGANIZER') là /organizer", () => {
    expect(roleHome('ORGANIZER')).toBe('/organizer');
  });

  it("roleHome('ADMIN') là /admin", () => {
    expect(roleHome('ADMIN')).toBe('/admin');
  });

  it("roleHome('USER') là /", () => {
    expect(roleHome('USER')).toBe('/');
  });
});

describe('canVisit', () => {
  it('ORGANIZER không vào được /tickets/:code', () => {
    expect(canVisit('ORGANIZER', '/tickets/TH-7K2M9QXP')).toBe(false);
  });

  it('ADMIN vào được /admin/users', () => {
    expect(canVisit('ADMIN', '/admin/users')).toBe(true);
  });

  it('khách vào được /events/:id', () => {
    expect(canVisit(null, '/events/e-1')).toBe(true);
  });

  it('khách không vào được /account', () => {
    expect(canVisit(null, '/account')).toBe(false);
  });

  it('người đã đăng nhập không còn vào /login', () => {
    expect(canVisit('USER', '/login')).toBe(false);
  });

  it('prefix chỉ khớp theo từng đoạn: /ticketsx không bị coi là /tickets', () => {
    expect(canVisit('ORGANIZER', '/ticketsx')).toBe(true);
  });
});

describe('landingPath', () => {
  it('USER với next=/tickets?page=2 về đúng next', () => {
    expect(landingPath('USER', '/tickets?page=2')).toBe('/tickets?page=2');
  });

  it('next trỏ ra ngoài (//evil.com) bị bỏ, về trang đích của role', () => {
    expect(landingPath('ADMIN', '//evil.com')).toBe('/admin');
  });
});

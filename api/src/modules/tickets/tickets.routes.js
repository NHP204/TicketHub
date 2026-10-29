import { Router } from 'express';

// Mã vé sai định dạng cũng chỉ là "không tìm thấy" (404), nên không cần schema cho :code.
export function createTicketsRouter(ticketsController, requireAuth) {
  const router = Router();
  // Đăng ký trước /tickets/:code để "me" không bị hiểu là mã vé.
  router.get('/tickets/me', requireAuth, ticketsController.listMine);
  router.get('/tickets/:code', requireAuth, ticketsController.getByCode);
  return router;
}

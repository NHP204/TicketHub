import { Router } from 'express';
import { authorize } from '../../middlewares/authorize.js';

// Chỉ USER có vé.
// Mã vé sai định dạng cũng chỉ là "không tìm thấy" (404), nên không cần schema cho :code.
export function createTicketsRouter(ticketsController, requireAuth) {
  const router = Router();
  const requireUser = [requireAuth, authorize('USER')];
  // Đăng ký trước /tickets/:code để "me" không bị hiểu là mã vé.
  router.get('/tickets/me', requireUser, ticketsController.listMine);
  router.get('/tickets/:code', requireUser, ticketsController.getByCode);
  return router;
}

import { ok } from '../../utils/response.js';

export function createPaymentsController(paymentService) {
  return {
    async pay(req, res) {
      const result = await paymentService.pay(req.user, req.validated.params.id);
      return ok(res, result);
    },
  };
}

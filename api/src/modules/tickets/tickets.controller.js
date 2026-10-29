import { ok } from '../../utils/response.js';

export function createTicketsController(ticketService) {
  return {
    async listMine(req, res) {
      const tickets = await ticketService.listMine(req.user);
      return ok(res, tickets);
    },

    async getByCode(req, res) {
      const ticket = await ticketService.getByCode(req.user, req.params.code);
      return ok(res, ticket);
    },
  };
}

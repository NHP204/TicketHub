import { ok } from '../../utils/response.js';

export function createStatsController(statsService) {
  return {
    async listOrganizerStats(req, res) {
      const stats = await statsService.listOrganizerStats(req.user);
      return ok(res, stats);
    },

    async getEventStats(req, res) {
      const stats = await statsService.getEventStats(req.user, req.validated.params.id);
      return ok(res, stats);
    },

    async getAdminStats(_req, res) {
      const stats = await statsService.getAdminStats();
      return ok(res, stats);
    },
  };
}

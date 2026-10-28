import { ok } from '../../utils/response.js';

export function createSectionsController(sectionService) {
  return {
    async create(req, res) {
      const section = await sectionService.create(
        req.user,
        req.validated.params.id,
        req.validated.body,
      );
      return ok(res, section, { status: 201 });
    },

    async update(req, res) {
      const section = await sectionService.update(
        req.user,
        req.validated.params.id,
        req.validated.body,
      );
      return ok(res, section);
    },

    async remove(req, res) {
      await sectionService.remove(req.user, req.validated.params.id);
      return ok(res, null);
    },
  };
}

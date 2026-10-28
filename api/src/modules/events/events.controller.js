import { ok } from '../../utils/response.js';

export function createEventsController(eventService) {
  return {
    async listPublished(req, res) {
      const { events, meta } = await eventService.listPublished(req.validated.query);
      return ok(res, events, { meta });
    },

    async listMine(req, res) {
      const events = await eventService.listMine(req.user);
      return ok(res, events);
    },

    async getById(req, res) {
      const event = await eventService.getById(req.user ?? null, req.validated.params.id);
      return ok(res, event);
    },

    async create(req, res) {
      const event = await eventService.create(req.user, req.validated.body);
      return ok(res, event, { status: 201 });
    },

    async update(req, res) {
      const event = await eventService.update(
        req.user,
        req.validated.params.id,
        req.validated.body,
      );
      return ok(res, event);
    },

    async publish(req, res) {
      const event = await eventService.publish(req.user, req.validated.params.id);
      return ok(res, event);
    },

    async cancel(req, res) {
      const event = await eventService.cancel(req.user, req.validated.params.id);
      return ok(res, event);
    },
  };
}

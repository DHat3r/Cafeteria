import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('responde status ok', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({ status: 'ok' });
  });
});

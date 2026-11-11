import { createApp } from './app';
import { seed } from './seed';
import { SIM_SPEED, tick } from './simulation';
import { log } from './logger';

const PORT = Number(process.env.PORT ?? 4000);

seed();
let last = Date.now();
setInterval(() => {
  const now = Date.now();
  tick(now, now - last);
  last = now;
}, 1000);

createApp().listen(PORT, '0.0.0.0', () => {
  log.info('server.started', { port: PORT, simSpeed: SIM_SPEED });
});

import { clearSessionUser } from '../../utils/session';

export default defineEventHandler((event) => {
  clearSessionUser(event);
  return { ok: true };
});

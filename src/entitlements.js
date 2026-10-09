import { getDatabase } from './security.js';

const PAID_PLANS = new Set(['paid', 'pro']);
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function hasPaidEntitlement(env, userId, now = Math.floor(Date.now() / 1000)) {
  const database = getDatabase(env);
  if (!database || !userId) return false;

  try {
    const subscription = await database
      .prepare(
        `SELECT plan, status, current_period_end
         FROM subscriptions
         WHERE user_id = ?`
      )
      .bind(userId)
      .first();

    if (!subscription) return false;
    if (!PAID_PLANS.has(subscription.plan) || !ACTIVE_STATUSES.has(subscription.status)) {
      return false;
    }
    return subscription.current_period_end === null
      || subscription.current_period_end === undefined
      || Number(subscription.current_period_end) > now;
  } catch (error) {
    console.error('Entitlement check failed:', error);
    return false;
  }
}
export async function startTrialSubscription(env, userId, now = Math.floor(Date.now() / 1000)) {
  const database = getDatabase(env);
  if (!database || !userId) return;
  try {
    await database
      .prepare(
        `INSERT INTO subscriptions (user_id, plan, status, current_period_end, created_at, updated_at)
         VALUES (?, 'paid', 'trialing', ?, ?, ?)
         ON CONFLICT(user_id) DO NOTHING`
      )
      .bind(userId, now + 3 * 86400, now, now)
      .run();
  } catch (error) {
    console.error('Trial subscription failed:', error);
  }
}

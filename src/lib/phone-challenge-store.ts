import 'server-only';
import {database} from './database';
import type {WidgetChallengeStore} from './msg91-widget';

/** Atomic statements work across API instances, including resend/verify races. */
export const phoneChallengeStore:WidgetChallengeStore={
  async reserve(phone,challenge) {
    const sql=database();
    const rows=await sql`INSERT INTO phone_otp_challenges(phone_e164,id,expires_at,resend_at)
      VALUES(${phone},${challenge.challengeId},${new Date(challenge.expiresAt)},${new Date(challenge.resendAt)})
      ON CONFLICT(phone_e164) DO UPDATE SET id=EXCLUDED.id,expires_at=EXCLUDED.expires_at,
      resend_at=EXCLUDED.resend_at,attempts=0,consumed_at=NULL,provider_request_id=NULL,provider_widget_id=NULL
      WHERE phone_otp_challenges.resend_at<=now() RETURNING id`;
    return rows.length===1;
  },
  async attempt(id) {
    const sql=database();
    const rows=await sql`UPDATE phone_otp_challenges SET attempts=attempts+1
      WHERE id=${id} AND consumed_at IS NULL AND expires_at>now() AND attempts<5
      RETURNING phone_e164`;
    return rows[0]?String(rows[0].phone_e164):null;
  },
  async consume(id) {
    const sql=database();
    return (await sql`UPDATE phone_otp_challenges SET consumed_at=now()
      WHERE id=${id} AND consumed_at IS NULL AND expires_at>now() RETURNING id`).length===1;
  },
  async invalidate(id) {
    const sql=database();
    await sql`UPDATE phone_otp_challenges SET consumed_at=now() WHERE id=${id}`;
  },
  async attachRequest(id,requestId,widgetId) {
    const sql=database();
    return (await sql`UPDATE phone_otp_challenges SET provider_request_id=${requestId},provider_widget_id=${widgetId}
      WHERE id=${id} AND consumed_at IS NULL AND expires_at>now() RETURNING id`).length===1;
  },
  async providerRequest(id,widgetId) {
    const sql=database();
    const rows=await sql`SELECT provider_request_id FROM phone_otp_challenges
      WHERE id=${id} AND provider_widget_id=${widgetId} AND consumed_at IS NULL AND expires_at>now()`;
    return rows[0]?.provider_request_id?String(rows[0].provider_request_id):null;
  },
};

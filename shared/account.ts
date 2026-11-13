export const accountRetention = {
  privateData: 'Profile, saved items, registrations, sessions and account-linked analytics are deleted immediately.',
  publicContent: 'Submitted listings and their draft/history copies are removed. Hosted events are removed, including their registrations. Export first and contact your guests before deleting a host account.',
  backups: 'Database backups may retain deleted data until the configured backup retention period ends. Local development has no managed backup policy.',
} as const;

export class AccountError extends Error {
  constructor(message:string,public status=400){super(message);}
}

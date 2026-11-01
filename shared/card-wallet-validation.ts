import {z} from 'zod';
export const cardWalletActions=[
  z.object({action:z.literal('card-owned'),id:z.string().min(1).max(80),enabled:z.boolean()}).strict(),
  z.object({action:z.literal('card-fee'),id:z.string().min(1).max(80),annualFee:z.number().nonnegative().max(100000).nullable()}).strict(),
  z.object({action:z.literal('card-usage'),id:z.string().min(1).max(80),benefitId:z.string().min(1).max(80),used:z.number().nonnegative().max(100000),eligible:z.boolean(),start:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),end:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict(),
] as const;
export const cardWalletSchema=z.discriminatedUnion('action',cardWalletActions);
export type CardWalletAction=z.infer<typeof cardWalletSchema>;

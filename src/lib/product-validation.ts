import {z} from 'zod';
import {pickUseCases} from '../../shared/mobile';
import {supportKindIds} from '../../shared/gym-supports';
import {purchaseHost,primaryPurchase,storeLabel,affiliateSeller} from '../../shared/purchases';
const checkedDate=z.string().datetime().refine(value=>new Date(value).getTime()<=Date.now()+300000,'A price check cannot be in the future.');
export const purchaseOptionSchema=z.object({
  availability:z.enum(['in-stock','out-of-stock','unknown']).optional(),
  url:z.string().max(2048).refine(value=>Boolean(purchaseHost(value)),'Use a public HTTPS shop link without credentials.'),sellerName:z.string().trim().min(2).max(80),
  affiliateUrl:z.union([z.literal('').transform(()=>undefined),z.string().max(2048).refine(value=>Boolean(purchaseHost(value)),'Use a public HTTPS affiliate link.')]).optional(),
  price:z.number().nonnegative().max(1000000),shippingFee:z.number().nonnegative().max(100000).nullable(),deliveryNote:z.string().trim().min(5).max(300),checkedAt:checkedDate,
  affiliateDisclosure:z.union([z.literal('').transform(()=>undefined),z.string().trim().min(3).max(200)]).optional(),
  offer:z.object({label:z.string().trim().min(3).max(100),terms:z.string().trim().min(5).max(400),code:z.string().trim().min(1).max(80).optional(),expiresAt:z.string().datetime().optional()}).strict().optional(),
}).strict().refine(value=>!value.affiliateUrl||storeLabel(value.url)===storeLabel(value.affiliateUrl),'Affiliate links must lead to the same seller as the product link.').refine(value=>!affiliateSeller(value)||Boolean(value.affiliateDisclosure),'Add a commercial disclosure for an affiliate link.');
export const recommendationsSchema=z.array(z.object({name:z.string().min(2).max(100),profileUrl:z.string().url().refine(value=>value.startsWith('https://')),sourceUrl:z.string().url().refine(value=>value.startsWith('https://')),claim:z.enum(['Uses','Recommends','Mentions']),context:z.string().min(5).max(500),disclosure:z.string().min(3).max(300),checkedAt:checkedDate,verified:z.boolean()})).max(30).optional();
export const productSchema=z.object({
  catalogueOnly:z.boolean().optional(),
  comparisonGroup:z.string().trim().min(3).max(120).optional(),
  imageUrl:z.string().url().refine(value=>value.startsWith('https://')).optional(),
  specifications:z.array(z.object({label:z.string().trim().min(1).max(100),value:z.string().trim().min(1).max(500),sourceUrl:z.string().url().refine(value=>value.startsWith('https://')),checkedAt:checkedDate})).max(40).optional(),
  assessment:z.object({shortlist:z.object({rank:z.number().int().min(1).max(100),group:z.string().trim().min(3).max(120),comparedWith:z.array(z.string().trim().min(3).max(150)).min(1).max(20)}).optional(),bestFor:z.string().min(3).max(500),notFor:z.string().min(3).max(500),whyChosen:z.string().min(10).max(1000),tradeoffs:z.array(z.string().min(3).max(300)).min(1).max(10),criteria:z.array(z.string().min(3).max(200)).min(1).max(10),sourceUrls:z.array(z.string().url().refine(value=>value.startsWith('https://'))).min(1).max(10),checkedAt:checkedDate}).optional(),
  recommendations:recommendationsSchema,
  variantLabel:z.string().trim().min(3).max(160),purchaseOptions:z.array(purchaseOptionSchema).min(1).max(5).refine(options=>new Set(options.map(option=>purchaseHost(option.url)?new URL(option.url).href:option.url)).size===options.length,'Use each seller link only once.'),
  title:z.string().trim().min(3).max(100),category:z.string().trim().min(1).max(128).refine(value=>!['Gear','Electronics'].includes(value),'Legacy categories cannot be submitted.'),subcategory:z.string().trim().min(1).max(100).optional(),equipmentType:z.enum(supportKindIds).optional(),
  useCases:z.array(z.enum(pickUseCases)).max(4).optional(),packLabel:z.string().trim().max(120).optional(),safetyNote:z.string().trim().max(500).optional(),
  tier:z.string().trim().min(1).max(100),price:z.number().nonnegative().max(1000000),summary:z.string().trim().min(10).max(800),
  url:z.string().url().refine(value=>value.startsWith('https://'),'Use an HTTPS source link.'),checkedAt:z.string().datetime(),
}).refine(value=>value.category==='Tech'?Boolean(value.subcategory):!value.subcategory,'Choose a Tech type only for Tech products.')
  .refine(value=>value.category==='Equipment'?Boolean(value.equipmentType):!value.equipmentType,'Choose an equipment type only for Equipment products.')
  .refine(value=>!value.useCases?.includes('pre-workout-drink')||value.category==='Food'||value.category==='Supplements','A drink pick must be Food or Supplements.')
  .refine(value=>value.category!=='Equipment'||Boolean(value.useCases?.length===1&&value.useCases[0]===value.equipmentType),'Link equipment to its matching support habit.')
  .refine(value=>!value.useCases?.some(tag=>supportKindIds.some(kind=>kind===tag))||value.category==='Equipment','Support habits require Equipment products.')
  .transform(value=>({...value,...primaryPurchase(value.purchaseOptions)!}));

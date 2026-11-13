import type {HabitFlow} from './mobile';

export const magnesiumSources={
  nih:{title:'NIH ODS · magnesium forms, labels and safety',url:'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/'},
  comparison:{title:'Firoz & Graber (2001) · human absorption comparison',url:'https://pubmed.ncbi.nlm.nih.gov/11794633/'},
  sleep:{title:'NCCIH · magnesium and sleep: evidence limitations',url:'https://www.nccih.nih.gov/health/in-the-news-magnesium-supplements-for-sleep-disorders'},
} as const;
export type MagnesiumForm={id:string;name:string;evidence:'human-comparisons'|'not-reviewed';absorption:string;interpretation:string;sourceIds:(keyof typeof magnesiumSources)[]};
// Evidence is about a particular comparison, not an overall product score.
// No absolute absorption percentage or clinical superiority is inferred.
export const magnesiumForms:MagnesiumForm[]=[
  {id:'citrate',name:'Citrate',evidence:'human-comparisons',absorption:'Small human studies found greater absorption than oxide.',interpretation:'This does not establish better sleep, recovery or suitability for you.',sourceIds:['nih']},
  {id:'oxide',name:'Oxide',evidence:'human-comparisons',absorption:'Lower absorption than several other forms in small human comparisons.',interpretation:'Lower absorption is not the same as useless, unsafe or poor manufacturing.',sourceIds:['nih','comparison']},
  {id:'chloride',name:'Chloride',evidence:'human-comparisons',absorption:'A small human comparison found greater absorption than oxide.',interpretation:'This is not a brand comparison or a universal best-form ranking.',sourceIds:['comparison']},
  {id:'glycinate',name:'Glycinate / bisglycinate',evidence:'not-reviewed',absorption:'Not ranked in this initial evidence review.',interpretation:'Do not infer superiority from a premium label. A separate comparative evidence review is needed here.',sourceIds:[]},
];
export function magnesiumForm(id:string){return magnesiumForms.find(form=>form.id===id);}
export function costPer100mg(price:number,servings:number,elementalMgPerServing:number):number|null{
  if(![price,servings,elementalMgPerServing].every(Number.isFinite)||price<0||servings<=0||elementalMgPerServing<=0)return null;
  const total=servings*elementalMgPerServing;
  if(!Number.isFinite(total))return null;
  const result=price/total*100;
  return Number.isFinite(result)?result:null;
}
export const magnesiumGuideFlow:HabitFlow={
  id:'nutrition-magnesium-labels',guideId:'magnesium',area:'Wellbeing',pathId:'nutrition',goal:'Supplement literacy',title:'Magnesium: understand the form',level:'Learn before buying',
  description:'Compare magnesium forms, decode elemental magnesium and separate creator claims from scientific evidence.',rhythm:'When considering a product—not a daily supplement instruction',
  milestone:'Understand the form and label before deciding whether a supplement is needed.',review:'What is verified on the label, and which claims still need checking?',
  guidance:'Education, not a prescription or a diagnosis. A supplement is not required to complete this flow.',sources:[magnesiumSources.nih,magnesiumSources.comparison,magnesiumSources.sleep],
  steps:[
    {id:'forms',title:'Compare forms, not just brand names',cue:'Open the form comparison and read what each absorption finding does—and does not—establish',duration:'A learning step'},
    {id:'label',title:'Check the actual product label',cue:'Find the form, elemental magnesium per serving, serving size and other ingredients. Missing label data stays unknown',duration:'When reviewing a product'},
    {id:'check',title:'Keep the purchase optional',cue:'Review food choices, suitability and medication questions with a qualified professional when needed. A creator recommendation is not proof',duration:'Before deciding'},
  ],
};

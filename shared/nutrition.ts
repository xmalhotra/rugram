import type {HabitFlow} from './mobile';

export const nutritionCategories=[
  {id:'protein',title:'Everyday protein',description:'Find protein foods that fit your usual meals.'},
  {id:'hydration',title:'Hydration & electrolytes',description:'Understand fluids and salts lost in sweat—not a reason for everyone to add extra salt.'},
  {id:'pre',title:'Pre-workout',description:'What to think about before a session.'},
  {id:'intra',title:'Intra-workout',description:'Food and fluids during a session, when needed.'},
  {id:'post',title:'Post-workout',description:'Make your next meal and recovery practical.'},
] as const;
export type NutritionCategory=typeof nutritionCategories[number]['id'];
export const nutritionSports=[
  {id:'running',title:'Running',description:'Consider duration, route, and what your stomach tolerates.'},
  {id:'gym',title:'Gym',description:'Fit nutrition around your actual strength or gym session.'},
  {id:'hyrox',title:'HYROX',description:'Practise a strategy for mixed running and strength efforts.'},
] as const;
export const proteinOptions=[
  {id:'plant',title:'Plant-based foods',description:'Dals, beans, chickpeas, soy or tofu, where suitable.'},
  {id:'dairy',title:'Vegetarian with dairy',description:'Consider dals, beans, curd or paneer, where suitable.'},
  {id:'mixed',title:'Includes eggs, meat or fish',description:'Use foods you already eat, alongside plant options.'},
] as const;
export function nutritionOptions(category:NutritionCategory){
  if(category==='protein')return [...proteinOptions];
  if(category==='hydration')return [{id:'everyday',title:'Everyday hydration',description:'A simple fluid habit outside training.'},...nutritionSports];
  return [...nutritionSports];
}
const preSource={title:'Sports Dietitians Australia: pre-exercise fuelling',url:'https://www.sportsdietitians.com.au/factsheets/pre-exercise-fuelling/'};
const fluidSource={title:'AIS: hydration education',url:'https://www.ausport.gov.au/ais/nutrition/education-modules/modules/hydration'};
const foodSource={title:'NHS: a balanced diet',url:'https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/'};
const sportNotes={
  running:'For running, consider access to fluids on the route and stomach comfort while moving. A short easy outing is not the same as a long endurance run.',
  gym:'For gym sessions, distinguish a short strength session from long, demanding training. A workout label alone does not establish a need for a sports drink or supplement.',
  hyrox:'For HYROX, consider the combined running and strength demands and opportunities to eat or drink. Practise any race strategy during appropriate training, not for the first time on race day.',
} as const;
const caution='General education and habit support, not a personalised diet, sodium target or supplement prescription. Duration, intensity, heat, sweat losses, meal timing and tolerance matter. Follow medical dietary/fluid restrictions. Seek a qualified sports dietitian for an individual strategy; do not force fluids, add salt, or take supplements just to complete this flow.';

function makeFlow(category:NutritionCategory,option:{id:string;title:string}):HabitFlow{
  const sport=nutritionSports.find(item=>item.id===option.id);
  const heading=nutritionCategories.find(item=>item.id===category)!;
  const notes=sport?sportNotes[sport.id]:'';
  const common:HabitFlow={id:`nutrition-${category}-${option.id}`,area:'Wellbeing',pathId:'nutrition',goal:heading.title,title:`${heading.title} · ${option.title}`,level:'Small starting habits',rhythm:category==='protein'||option.id==='everyday'?'Around your everyday meals':'Around appropriate planned training sessions',description:notes||'Start with a familiar, practical choice. This flow does not require a purchase or a complete diet overhaul.',milestone:'Find a repeatable choice that fits your routine and note what needs adapting.',review:'Was it practical, affordable and comfortable? Note how the session or day felt. These observations are not proof of a product’s effectiveness.',guidance:caution,sources:category==='pre'?[preSource,fluidSource]:category==='hydration'||category==='intra'?[fluidSource]:[foodSource],steps:[]};
  if(category==='protein'){
    const examples=proteinOptions.find(item=>item.id===option.id)!.description;
    return {...common,steps:[
      {id:'meal',title:'Choose one regular meal',cue:'Before the day gets busy, choose a meal you can realistically influence',duration:'1 minute'},
      {id:'food',title:'Include a familiar protein food',cue:`When choosing that meal: ${examples} Account for allergies, dietary restrictions and preferences`,duration:'A meal preference'},
      {id:'note',title:'Note what worked in real life',cue:'After the meal, record availability, cost and whether you would choose it again',duration:'1 minute'},
    ]};
  }
  if(category==='hydration')return {...common,steps:[
    {id:'context',title:'Notice today’s conditions',cue:option.id==='everyday'?'Consider your normal day, weather and any medical fluid restrictions':'Before training, note duration, heat, expected sweating, and access to fluids',duration:'1 minute'},
    {id:'fluid',title:'Make a suitable drink accessible',cue:'Keep water available. Electrolytes are optional and context-specific, not an instruction to add salt to every drink',duration:'A drink preference'},
    {id:'review',title:'Check comfort, not a drinking target',cue:'Afterward, note what was practical. Do not force large amounts of fluid or use symptoms to self-diagnose a salt deficiency',duration:'1 minute'},
  ]};
  if(category==='pre')return {...common,steps:[
    {id:'context',title:'Look at the session ahead',cue:'Before deciding on food, note session length, effort, heat, time since your last meal, and what usually feels comfortable',duration:'2 minutes'},
    {id:'food',title:'Choose a familiar food plan',cue:sport?.id==='running'?'Use a familiar pre-run meal or snack when needed; avoid testing an unfamiliar product just before a demanding run':sport?.id==='gym'?'Fit your usual meal or a familiar snack around the session; do not treat a stimulant pre-workout powder as mandatory':'Use familiar food and timing, and practise race-day fuelling choices during appropriate training',duration:'A meal or snack preference'},
    {id:'drink',title:'Consider a drink without a sales requirement',cue:'Make water available. If comparing electrolyte mixes, check suitability and ingredients; low-sugar electrolytes are not the same thing as carbohydrate fuel',duration:'A drink preference',pickContext:{label:'Optional drink choices in Picks',useCase:'pre-workout-drink'}},
    {id:'note',title:'Note comfort and practicality',cue:'After the session, record what you chose and how it fitted. Adjust one thing at a time',duration:'1 minute'},
  ]};
  if(category==='intra')return {...common,steps:[
    {id:'context',title:'Decide whether an intra-session plan is needed',cue:'Before the session, consider duration, effort, heat and access. Do not assume every short workout needs additional fuel or electrolytes',duration:'2 minutes'},
    {id:'access',title:'Plan access, not a mandatory purchase',cue:sport?.id==='running'?'For a longer route, check drink access and practise any appropriate fuelling plan on training outings':sport?.id==='gym'?'Know where you can take a drink break. Match any additional food or fluid plan to the actual session, not the label “gym”':'Check the organiser’s aid arrangements and practise a suitable strategy in training rather than introducing a new product during a race',duration:'During session planning'},
    {id:'review',title:'Keep a simple session note',cue:'Afterward, note duration, conditions, what you consumed and comfort. Get qualified guidance for demanding sessions or recurring issues',duration:'2 minutes'},
  ]};
  return {...common,steps:[
    {id:'meal',title:'Know what your next meal will be',cue:'Before training, think about when you can next eat and what familiar food will be available',duration:'2 minutes'},
    {id:'recover',title:'Use a practical recovery meal',cue:'After the session, choose suitable familiar food with a protein source and carbohydrate-containing foods as appropriate to your needs; a supplement is not required',duration:'A meal preference'},
    {id:'review',title:'Consider the next session too',cue:'Note when you next train, your comfort and access to food and fluids. Seek individual advice if training sessions are close together',duration:'1 minute'},
  ]};
}
export const nutritionFlows:HabitFlow[]=nutritionCategories.flatMap(category=>nutritionOptions(category.id).map(option=>makeFlow(category.id,option)));
export function nutritionFlow(library:HabitFlow[],category:string,option:string){
  if(!nutritionCategories.some(item=>item.id===category))return undefined;
  if(!nutritionOptions(category as NutritionCategory).some(item=>item.id===option))return undefined;
  return library.find(flow=>flow.id===`nutrition-${category}-${option}`);
}

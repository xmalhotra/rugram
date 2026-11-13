// Public issuer-directory discovery only. Candidates require editorial review;
// a discovered link is not proof of current issuance, fees, or eligibility.
export const sources=[
 ['hdfc','HDFC Bank','https://www.hdfc.bank.in/credit-cards'],
 ['sbi','SBI Card','https://www.sbicard.com/en/personal/credit-cards.html'],
 ['icici','ICICI Bank','https://www.icicibank.com/personal-banking/cards/credit-card'],
 ['axis','Axis Bank','https://www.axisbank.com/retail/cards/credit-card'],
 ['kotak','Kotak Mahindra Bank','https://www.kotak.com/en/personal-banking/cards/credit-cards.html'],
 ['indusind','IndusInd Bank','https://www.indusind.com/in/en/personal/cards/credit-card.html'],
 ['yes','YES BANK','https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards'],
 ['idfc','IDFC FIRST Bank','https://www.idfcfirstbank.com/credit-card'],
 ['au','AU Small Finance Bank','https://www.au.bank.in/personal-banking/credit-cards'],
 ['rbl','RBL Bank','https://www.rbl.bank.in/personal-banking/cards/credit-cards'],
 ['hsbc','HSBC India','https://www.hsbc.co.in/credit-cards/'],
 ['amex','American Express India','https://www.americanexpress.com/in/credit-cards/all-cards/'],
 ['sc','Standard Chartered India','https://www.sc.com/in/credit-cards/'],
 ['federal','Federal Bank','https://www.federalbank.co.in/credit-cards'],
 ['bob','BOBCARD','https://www.bobcard.co.in/credit-cards'],
 ['pnb','Punjab National Bank','https://www.pnbcard.in/'],
 ['canara','Canara Bank','https://canarabank.com/pages/credit-cards'],
 ['union','Union Bank of India','https://www.unionbankofindia.co.in/en/common/credit-card'],
 ['boi','Bank of India','https://bankofindia.co.in/credit-card'],
 ['iob','Indian Overseas Bank','https://www.iob.in/Credit-Cards'],
 ['indian','Indian Bank','https://www.indianbank.in/departments/credit-card/'],
 ['central','Central Bank of India','https://centralbankofindia.co.in/en/credit-cards'],
 ['idbi','IDBI Bank','https://www.idbibank.in/credit-cards.aspx'],
 ['dbs','DBS Bank India','https://www.dbs.com/digibank/in/cards/credit-cards'],
 ['sbm','SBM Bank India','https://www.sbmbank.co.in/personal-banking/cards/credit-cards.php'],
 ['southindian','South Indian Bank','https://www.southindianbank.com/content/personal-banking/credit-card/883'],
 ['karnataka','Karnataka Bank','https://karnatakabank.com/personal/cards/credit-cards'],
 ['karur','Karur Vysya Bank','https://www.kvb.co.in/personal/cards/credit-cards/'],
 ['tmb','Tamilnad Mercantile Bank','https://www.tmb.in/pages/Credit-Card'],
 ['citi-legacy','Citi India (legacy / migration audit)','https://www.online.citibank.co.in/products-services/credit-cards/credit-card.htm'],
];
const clean=value=>value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&(?:rsquo|#8217);/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const results=[];
const selected=process.env.CREDIT_RESEARCH_IDS?sources.filter(source=>process.env.CREDIT_RESEARCH_IDS.split(',').includes(source[0])):sources;
for(let i=0;i<selected.length;i+=5)await Promise.all(selected.slice(i,i+5).map(async([id,title,url])=>{
  const checkedAt=new Date().toISOString();
  try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});const html=await r.text();const candidates=[];
    for(const m of html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)){
      const name=clean(m[4]);let link;try{link=new URL(m[2],r.url)}catch{continue;}
      if(link.protocol!=='https:'||!/(?:credit.?card|sbi-card|rupay|infinia|diners|regalia|millennia|sapphiro|emeralde|cashback|platinum|centurion)/i.test(link.pathname+' '+name))continue;
      if(name.length<4||name.length>120||/^(?:credit cards?|cards?|rewards?|personal|business|corporate|secured)$/i.test(name)||/apply|login|know more|learn more|benefits|terms|eligib|faq|compare|fees|charges|payment|statement|offer|privacy|download|calculator|bill|service|contact|customer|view all|all card|help|insurance|balance|pin|activate|lost|blocked|enquire|track|control|EMI|home|financial|pay now|read more|about|blog|access/i.test(name))continue;
      if(!link.hostname.endsWith(new URL(r.url).hostname.replace(/^www\./,'')))continue;
      if(!candidates.some(c=>c.name.toLowerCase()===name.toLowerCase()))candidates.push({name,url:link.href.split('#')[0]});
    }
    const headings=[...html.matchAll(/<h[1-5]\b[^>]*>([\s\S]*?)<\/h[1-5]>/gi)].map(m=>clean(m[1]));
    const imageLabels=[...html.matchAll(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi)].map(m=>clean(m[1]));
    const relevant=name=>/card|infinia|legend|pinnacle|cookies|wealth|platinum|quantum|wow|ashva|mayura|pioneer/i.test(name)&&name.length<100;
    results.push({id,title,url,finalUrl:r.url,checkedAt,httpStatus:r.status,coverage:r.ok?'partial':'blocked',candidates:candidates.filter(c=>relevant(c.name)).slice(0,80),headings:[...new Set(headings.filter(relevant))].slice(0,90),imageLabels:[...new Set(imageLabels.filter(relevant))].slice(0,80)});
  }catch(error){results.push({id,title,url,checkedAt,coverage:'blocked',error:error.message,candidates:[]});}
}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),scope:'Public issuer-directory discovery; no completeness or new-application guarantee.',issuers:results.sort((a,b)=>a.title.localeCompare(b.title))}));

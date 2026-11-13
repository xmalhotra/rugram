import React,{useState} from 'react';
import {HealthNote} from './OutboundLink';
import {View} from 'react-native';
import {Text} from './design/Text';
import {costPer100mg,magnesiumForm,magnesiumForms,magnesiumSources} from '../../shared/magnesium';
import {Badge,Button,Card,Choice,Field,SectionHeader} from './design/components';
import {space,useTheme} from './design/theme';

export function MagnesiumGuide({onLink}:{onLink:(url:string)=>void}){
  const {colors:C}=useTheme();const [step,setStep]=useState(0);const [first,setFirst]=useState('Citrate');const [second,setSecond]=useState('Oxide');
  const [price,setPrice]=useState('');const [servings,setServings]=useState('');const [elemental,setElemental]=useState('');
  const text={color:C.muted} as const;const heading={color:C.text} as const;
  const selection=[first,second].map(name=>magnesiumForm(magnesiumForms.find(form=>form.name===name)!.id)!);
  const value=price.trim()&&servings.trim()&&elemental.trim()?costPer100mg(Number(price),Number(servings),Number(elemental)):null;
  const titles=['Compare forms','Read the label','Check the claim'];
  return <View style={{gap:space.md}}>
    <HealthNote/>
    <Badge>MAGNESIUM · {step+1} OF 3 · {titles[step].toUpperCase()}</Badge>
    {step===0 && <>
      <SectionHeader title="Same mineral. Different forms." />
      <Text variant="callout" style={text}>The form matters. But absorption, a health benefit and product quality are different questions.</Text>
      <Choice label="First form" value={first} options={magnesiumForms.map(form=>form.name)} onChange={name=>{if(name===second)setSecond(first);setFirst(name);}}/>
      <Choice label="Compare with" value={second} options={magnesiumForms.map(form=>form.name).filter(name=>name!==first)} onChange={setSecond}/>
      {selection.map(form=><Card key={form.id}><Text variant="heading" style={heading}>Magnesium {form.name.toLowerCase()}</Text><Badge>{form.evidence==='human-comparisons'?'SMALL HUMAN ABSORPTION STUDIES':'NOT ASSESSED HERE · NOT A NEGATIVE VERDICT'}</Badge><Text variant="callout" style={text}>{form.absorption}</Text><Text variant="callout" style={text}>{form.interpretation}</Text>{form.sourceIds.map(id=><Button key={id} title={`${magnesiumSources[id].title} ↗`} secondary onPress={()=>onLink(magnesiumSources[id].url)}/>)}</Card>)}
      <Text variant="callout" style={text}>We do not show fixed absorption percentages, a “best for everyone” winner or a gold badge for an entire brand. These starting forms are not the full magnesium library.</Text>
    </>}
    {step===1 && <>
      <SectionHeader title="What is actually in a serving?" />
      <Card><Text variant="heading" style={heading}>Compound weight ≠ elemental magnesium</Text><Text variant="callout" style={text}>Compare the stated elemental magnesium per serving—not just the weight of the whole compound.</Text><Button title="NIH label background ↗" secondary onPress={()=>onLink(magnesiumSources.nih.url)}/></Card>
      <Text variant="callout" style={text}>Check the form, serving size, elemental amount, ingredients and product-label source. If a blend does not disclose individual form amounts, keep them unknown. Never estimate absorbed milligrams from the salt name.</Text>
      <Card><Text variant="heading" style={heading}>Optional price comparison</Text><Text variant="callout" style={text}>Enter figures from a label and current checkout. These inputs are yours, not independently verified product data.</Text>
        <Field label="Pack price in INR" value={price} onChange={setPrice} numeric/>
        <Field label="Servings in the pack (not tablet count)" value={servings} onChange={setServings} numeric/>
        <Field label="Elemental magnesium per serving (mg)" value={elemental} onChange={setElemental} numeric/>
        {value!==null?<><Text variant="heading" style={{color:C.lime}}>₹{value.toFixed(2)} per 100 mg elemental magnesium</Text><Badge>Label-content price only—not absorbed dose, effectiveness or a recommended serving.</Badge></>:<Text variant="callout" style={text}>Enter all three valid figures to compare like-for-like label content.</Text>}
      </Card>
    </>}
    {step===2 && <>
      <SectionHeader title="A recommendation is not proof." />
      <Card><Badge>ABSORPTION EVIDENCE</Badge><Text variant="callout" style={text}>What was studied: the form, dose, people and comparison. This is distinct from whether a particular product helps your goal.</Text></Card>
      <Card><Badge>GOAL-SPECIFIC EVIDENCE</Badge><Text variant="callout" style={text}>Magnesium’s sleep claims have limited, low-quality evidence. Better absorption alone does not prove better sleep.</Text><Button title="Read NCCIH’s sleep evidence summary ↗" secondary onPress={()=>onLink(magnesiumSources.sleep.url)}/></Card>
      <Card><Badge>CREATOR REFERENCE</Badge><Text variant="callout" style={text}>A creator’s explanation or experience belongs in a separate reference, with the original link and any sponsorship disclosure. It does not upgrade the scientific evidence.</Text><Badge>No Fort Pharma recommendation or product endorsement is assumed.</Badge></Card>
      <Card><Text variant="heading" style={heading}>Before taking anything</Text><Text variant="callout" style={text}>Food can provide magnesium. Supplements can cause diarrhoea and interact with medicines. Kidney disease increases toxicity risk; discuss suitability with a clinician or pharmacist.</Text><Text variant="callout" style={text}>This guide does not diagnose deficiency or prescribe a product, dose or treatment.</Text><Button title="Safety and medication background ↗" secondary onPress={()=>onLink(magnesiumSources.nih.url)}/></Card>
      <Text variant="callout" style={text}>No brand or price is invented here. Product comparisons need actual labels, current price references and a separate quality-evidence review.</Text>
    </>}
    {step>0 && <Button title="← Previous" secondary onPress={()=>setStep(value=>value-1)}/>}
    {step<2 && <Button title={step===0?'Next: read a product label':'Next: check claims and safety'} onPress={()=>setStep(value=>value+1)}/>}
  </View>;
}

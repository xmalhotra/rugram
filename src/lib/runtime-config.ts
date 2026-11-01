type Environment=Readonly<Record<string,string|undefined>>;
export function isDeployedEnvironment(env:Environment){
 return env.NODE_ENV==='production'||['preview','staging','production'].includes(env.APP_ENV??'')||['preview','production'].includes(env.VERCEL_ENV??'');
}
/** QRAM_DEMO_MODE is the current name. BETTERHABITS_DEMO_MODE and RUGRAM_DEMO_MODE remain fallback aliases. */
export function demoModeSetting(env:Environment){
 const names=['QRAM_DEMO_MODE','BETTERHABITS_DEMO_MODE','RUGRAM_DEMO_MODE'] as const;
 const values=names.map(name=>env[name]).filter((value):value is string=>value!==undefined);
 if(values.some(value=>value!==values[0]))throw new Error('QRAM_DEMO_MODE, BETTERHABITS_DEMO_MODE and RUGRAM_DEMO_MODE disagree. Set only QRAM_DEMO_MODE.');
 return env.QRAM_DEMO_MODE??env.BETTERHABITS_DEMO_MODE??env.RUGRAM_DEMO_MODE;
}
/** No credentials or configuration values belong in these error messages. */
export function demoModeEnabled(env:Environment){
 const setting=demoModeSetting(env);
 if(setting!==undefined&&!['true','false',''].includes(setting))throw new Error('QRAM_DEMO_MODE must be true or false.');
 if(env.APP_ENV&&!['local','test','preview','staging','production'].includes(env.APP_ENV))throw new Error('APP_ENV must be local, test, preview, staging or production.');
 const enabled=setting==='true';
 if(enabled&&isDeployedEnvironment(env))throw new Error('Demo mode is forbidden in preview, staging and production. Set QRAM_DEMO_MODE=false and configure DATABASE_URL.');
 return enabled;
}
/** Structured request logs default on in deployed environments; API_TELEMETRY=false opts out. */
export function telemetryEnabled(env:Environment=process.env){
 if(env.API_TELEMETRY==='true')return true;
 if(env.API_TELEMETRY==='false')return false;
 return isDeployedEnvironment(env);
}
/** Called before a Next.js server instance starts accepting requests. No network I/O. */
export function assertRuntimeConfiguration(env:Environment){
 if(demoModeEnabled(env))return {mode:'demo' as const};
 if(!env.DATABASE_URL?.trim())throw new Error('DATABASE_URL is required when demo mode is off. Local demos require explicit QRAM_DEMO_MODE=true.');
 try{const url=new URL(env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname)throw new Error();}
 catch{throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');}
 return {mode:'database' as const};
}

import { apiError } from './http';
import { telemetryEnabled } from './runtime-config';
export async function readMobileJson(request: Request, maxBytes=16384): Promise<unknown> {
  if(Number(request.headers.get('content-length') ?? 0)>maxBytes) throw new Error('REQUEST_TOO_LARGE');
  const reader=request.body?.getReader(); if(!reader) return null;
  const chunks: Uint8Array[]=[]; let size=0;
  try { for(;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>maxBytes) { await reader.cancel(); throw new Error('REQUEST_TOO_LARGE'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
  try {return JSON.parse(new TextDecoder().decode(bytes));} catch {return null;}
}
export function observed(handler: (request: Request)=>Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const started=performance.now(); const requestId=crypto.randomUUID(); let response: Response;
    try {response=await handler(request);} catch(error) {response=error instanceof Error && error.message==='REQUEST_TOO_LARGE' ? apiError('Request is too large.',413) : apiError('Service temporarily unavailable. Please try again.',503);}
    const duration=Math.round(performance.now()-started); response.headers.set('X-Request-Id',requestId); response.headers.set('Server-Timing',`app;dur=${duration}`);
    if(telemetryEnabled() || response.status>=500) console.info(JSON.stringify({event:'mobile_request',requestId,method:request.method,path:new URL(request.url).pathname,status:response.status,durationMs:duration}));
    return response;
  };
}

import {assertRuntimeConfiguration} from './lib/runtime-config';

export function register(){
 assertRuntimeConfiguration(process.env);
}

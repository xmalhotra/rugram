import 'server-only';
import {z} from 'zod';
import {database} from './database';
import {isDemoMode} from './store';
import {exercises as seedExercises,type Exercise} from '../../shared/exercises';
import {workoutSteps,absWorkoutFlow} from '../../shared/workouts';
import type {HabitFlow,WorkoutPlan} from '../../shared/mobile';
import type {PublicUser} from './types';
const common={exerciseId:z.string().min(1).max(80),sets:z.number().int().min(1).max(5),restSeconds:z.number().int().min(0).max(300),perSide:z.boolean()};
export const workoutSchema=z.object({title:z.string().trim().min(3).max(100),description:z.string().trim().min(10).max(500),benefits:z.array(z.string().trim().min(5).max(160)).min(1).max(3),blocks:z.array(z.discriminatedUnion('mode',[z.object({...common,mode:z.literal('reps'),reps:z.number().int().min(1).max(50)}).strict(),z.object({...common,mode:z.literal('hold'),seconds:z.number().int().min(5).max(120)}).strict()])).min(1).max(12).refine(blocks=>new Set(blocks.map(block=>block.exerciseId)).size===blocks.length,'Pick each exercise only once.')}).strict();
type WorkoutInput=z.infer<typeof workoutSchema>;
declare global{var betterHabitsExerciseStore:{exercises:Exercise[];workouts:HabitFlow[];requests:Record<string,string>}|undefined;}
const state=globalThis.betterHabitsExerciseStore??={exercises:structuredClone(seedExercises),workouts:[],requests:{}};
export async function workoutCatalog():Promise<{exercises:Exercise[];workouts:HabitFlow[]}>{
  if(isDemoMode())return structuredClone({exercises:state.exercises,workouts:state.workouts});
  const sql=database();
  const [library,workouts]=await Promise.all([
    sql`SELECT data FROM mobile_exercises WHERE status='published' ORDER BY id LIMIT 500`,
    sql`SELECT w.data,jsonb_agg(jsonb_build_object('exerciseId',e.exercise_id,'sets',e.sets,'mode',e.mode,'reps',e.reps,'seconds',e.hold_seconds,'restSeconds',e.rest_seconds,'perSide',e.per_side) ORDER BY e.position) AS blocks FROM mobile_workouts w JOIN mobile_workout_exercises e ON e.workout_id=w.id WHERE w.status='published' GROUP BY w.id,w.data ORDER BY w.created_at DESC LIMIT 100`,
  ]);
  const available=library.map(row=>row.data as Exercise);
  return {exercises:available,workouts:workouts.map(row=>{const flow=row.data as HabitFlow;const workout={...flow.workout!,blocks:row.blocks as WorkoutPlan['blocks']};return {...flow,workout,steps:workoutSteps(workout,available)};})};
}
export async function createWorkout(user:PublicUser,input:WorkoutInput,requestId:string){
  if(user.role!=='admin')throw new Error('Admin access required.');
  const library=await workoutCatalog();
  if(input.blocks.some(block=>!library.exercises.some(exercise=>exercise.id===block.exerciseId)))throw new Error('Exercise not available.');
  if(input.blocks.some(block=>{const exercise=library.exercises.find(item=>item.id===block.exerciseId)!;return block.mode!==(['plank','side-plank'].includes(exercise.icon)?'hold':'reps');}))throw new Error('Exercise not available for that measurement type.');
  const requestKey=`${user.id}:${requestId}`;
  if(isDemoMode() && state.requests[requestKey])return;
  const workout:WorkoutPlan={benefits:input.benefits,blocks:input.blocks,progression:absWorkoutFlow.workout!.progression,safety:absWorkoutFlow.workout!.safety};
  const flow:HabitFlow={...absWorkoutFlow,id:`workout-${crypto.randomUUID()}`,title:input.title,description:input.description,workout,steps:workoutSteps(workout,library.exercises)};
  if(isDemoMode()){state.workouts.push(flow);state.requests[requestKey]=flow.id;return;}
  const sql=database();
  await sql.transaction([
    sql`INSERT INTO mobile_workouts(id,created_by,data,request_key) VALUES(${flow.id},${user.id},${JSON.stringify({...flow,workout:{...workout,blocks:[]}})}::jsonb,${requestKey}) ON CONFLICT(request_key) DO NOTHING`,
    ...workout.blocks.map((block,position)=>sql`INSERT INTO mobile_workout_exercises(workout_id,exercise_id,position,sets,mode,reps,hold_seconds,rest_seconds,per_side) SELECT id,${block.exerciseId},${position},${block.sets},${block.mode},${block.mode==='reps'?block.reps:null},${block.mode==='hold'?block.seconds:null},${block.restSeconds},${block.perSide} FROM mobile_workouts WHERE request_key=${requestKey} AND id=${flow.id} ON CONFLICT DO NOTHING`),
  ]);
}

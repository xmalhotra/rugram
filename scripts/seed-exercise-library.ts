import dotenv from 'dotenv';
import {database} from '../src/lib/database';
import {exercises} from '../shared/exercises';
import {absWorkoutFlow} from '../shared/workouts';
dotenv.config({path:process.env.DOTENV_CONFIG_PATH??'.env.local',quiet:true});
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required. Demo mode already includes the exercise library.');
const sql=database();
await sql.transaction([
  ...exercises.map(exercise=>sql`INSERT INTO mobile_exercises(id,category,data) VALUES(${exercise.id},${exercise.category},${JSON.stringify(exercise)}::jsonb) ON CONFLICT(id) DO NOTHING`),
  sql`INSERT INTO mobile_workouts(id,data,request_key) VALUES(${absWorkoutFlow.id},${JSON.stringify({...absWorkoutFlow,workout:{...absWorkoutFlow.workout,blocks:[]}})}::jsonb,'seed-core-foundations-v1') ON CONFLICT(id) DO NOTHING`,
  ...absWorkoutFlow.workout!.blocks.map((block,position)=>sql`INSERT INTO mobile_workout_exercises(workout_id,exercise_id,position,sets,mode,reps,hold_seconds,rest_seconds,per_side) SELECT id,${block.exerciseId},${position},${block.sets},${block.mode},${block.mode==='reps'?block.reps:null},${block.mode==='hold'?block.seconds:null},${block.restSeconds},${block.perSide} FROM mobile_workouts WHERE id=${absWorkoutFlow.id} AND request_key='seed-core-foundations-v1' ON CONFLICT DO NOTHING`),
]);
console.log('Exercise library seeded without replacing existing records.');

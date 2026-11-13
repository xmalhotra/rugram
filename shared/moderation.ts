export const reviewCodes=['sources','accuracy','disclosure','duplicate','out-of-scope','other'] as const;
export type ReviewCode=typeof reviewCodes[number];
export type ModerationFields={reviewNote?:string;reviewCode?:ReviewCode;reviewedAt?:string;reviewedBy?:string;withdrawnAt?:string};
export function reviewReason(note:unknown,code:unknown) {
  if(typeof note!=='string'||note.trim().length<5||note.trim().length>500||!reviewCodes.includes(code as ReviewCode))throw new Error('Content rejection needs a reason code and a note of 5–500 characters.');
  return {reviewNote:note.trim(),reviewCode:code as ReviewCode};
}

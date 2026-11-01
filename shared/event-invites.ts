export type EventInviteRequest={id:string;eventId:string;eventTitle:string;guestId:string;guestName:string;requestedAt:string};
export type EventInviteInbox={requests:EventInviteRequest[];total:number};

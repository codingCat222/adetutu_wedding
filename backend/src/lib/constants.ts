export const CodeStatus = { UNUSED: "UNUSED", USED: "USED", REVOKED: "REVOKED" } as const;
export type CodeStatus = (typeof CodeStatus)[keyof typeof CodeStatus];

export const AttendanceStatus = { ATTENDING: "ATTENDING", NOT_ATTENDING: "NOT_ATTENDING" } as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const ADMIN_COOKIE = "admin_session";
export const INVITATION_COOKIE = "invitation_session";
export const MAX_ATTENDEES = 10;
export const MAX_BULK_CODES = 500;

export const CapGeleInterest = { NONE: "NONE", CAP: "CAP", GELE: "GELE" } as const;
export type CapGeleInterest = (typeof CapGeleInterest)[keyof typeof CapGeleInterest];

export type AttendanceStatus = "ATTENDING" | "NOT_ATTENDING";

export interface RsvpFormValues {
  fullName: string;
  phoneNumber: string;
  email?: string;
  numberOfGuests: number;
  attendanceStatus: AttendanceStatus;
  dietaryRequirements?: string;
  specialMessage?: string;
}

export interface VerifyCodeResponse {
  ok: boolean;
  message?: string;
}

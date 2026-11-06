import type { LeaveRequest, PermissionRequest, RegularizationRequest } from "@/app/store/requests/requestSlice";

export type AttendanceRequest =
  | { type: "leave"; request: LeaveRequest }
  | { type: "permission"; request: PermissionRequest }
  | { type: "regularization"; request: RegularizationRequest };

export const requestTypeLabel = (type: AttendanceRequest["type"]): string =>
  type === "leave" ? "Leave" : type === "permission" ? "Permission" : "Regularization";

export function validateRequestDates(requests: AttendanceRequest[]): void {
  const isDate = (value: unknown): value is string => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(value)) return false;
    const day = value.slice(0, 10);
    const parsed = new Date(`${day}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  };

  for (const item of requests) {
    if (!["PENDING", "APPROVED", "REJECTED"].includes(item.request.status)) continue;
    if (item.type === "leave") {
      const { from_date, to_date } = item.request;
      if (!isDate(from_date) || !isDate(to_date) || from_date.slice(0, 10) > to_date.slice(0, 10)) {
        throw new Error(`Invalid dates for leave request #${item.request.id}.`);
      }
    } else if (item.type === "permission" && !isDate(item.request.perm_date)) {
      throw new Error(`Invalid date for permission request #${item.request.id}.`);
    } else if (item.type === "regularization" && !isDate(item.request.work_date)) {
      throw new Error(`Invalid date for regularization request #${item.request.id}.`);
    }
  }
}

export function requestsForDay(
  requests: AttendanceRequest[],
  userId: string | number,
  date: string
): AttendanceRequest[] {
  const day = date.slice(0, 10);
  return requests.filter(({ type, request }) => {
    const requestUserId = type === "regularization" ? request.employee?.id : request.user_id;
    if (requestUserId == null || String(requestUserId) !== String(userId) ||
        !["PENDING", "APPROVED", "REJECTED"].includes(request.status)) {
      return false;
    }
    if (type === "leave") {
      const start = request.from_date.slice(0, 10);
      const end = request.to_date.slice(0, 10);
      return start <= day && day <= end;
    }
    return (type === "permission" ? request.perm_date : request.work_date).slice(0, 10) === day;
  });
}

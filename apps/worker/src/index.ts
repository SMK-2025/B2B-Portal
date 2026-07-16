export type JobName = "profile.precheck" | "matching.recalculate" | "notification.send";

export interface PortalJob<T = unknown> {
  id: string;
  name: JobName;
  payload: T;
  objectVersion: number;
  createdAt: string;
}

export function assertCurrentVersion(job: PortalJob, currentVersion: number): void {
  if (job.objectVersion !== currentVersion) throw new Error("Outdated job version");
}

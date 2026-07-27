// SPDX-License-Identifier: MIT
import { ScheduleRunner } from "./schedule-runner";
import { ScheduleService } from "./schedule-service";

export const scheduleService = new ScheduleService();
export const scheduleRunner = new ScheduleRunner(scheduleService);

export * from "./db";
export { ScheduleRunner, ScheduleService };

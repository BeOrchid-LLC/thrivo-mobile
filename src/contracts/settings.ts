import { z } from "zod";
import { isoDateSchema } from "./common";
import { unitSystemSchema } from "./user";

export const reminderWeekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export type ReminderWeekday = z.infer<typeof reminderWeekdaySchema>;

const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

export const userSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  unitSystem: unitSystemSchema,
  pushNotificationsEnabled: z.boolean(),
  dailyFoodLogReminderEnabled: z.boolean(),
  dailyFoodLogReminderTime: timeSchema,
  weightCheckReminderEnabled: z.boolean(),
  weightCheckReminderDay: reminderWeekdaySchema,
  weightCheckReminderTime: timeSchema,
  hydrationReminderEnabled: z.boolean(),
  hydrationReminderIntervalMinutes: z.number().int(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateUserSettingsPayload = z.object({
  unitSystem: unitSystemSchema.optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  dailyFoodLogReminderEnabled: z.boolean().optional(),
  dailyFoodLogReminderTime: timeSchema.optional(),
  weightCheckReminderEnabled: z.boolean().optional(),
  weightCheckReminderDay: reminderWeekdaySchema.optional(),
  weightCheckReminderTime: timeSchema.optional(),
  hydrationReminderEnabled: z.boolean().optional(),
  hydrationReminderIntervalMinutes: z.number().int().min(5).max(240).optional(),
});
export type UpdateUserSettingsPayload = z.infer<typeof updateUserSettingsPayload>;

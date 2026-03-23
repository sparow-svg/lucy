import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const connectedServices = pgTable("connected_services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  serviceName: text("service_name").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ConnectedService = typeof connectedServices.$inferSelect;

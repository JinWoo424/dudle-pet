import { drizzle } from "drizzle-orm/postgres-js";
import { getSql } from "./connection";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getSql(), { schema });
}

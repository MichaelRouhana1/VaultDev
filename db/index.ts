import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For query purposes
// One warm instance should not open a pile of Supabase pooler connections.
// A few is enough for Promise.all in a single admin render.
const queryClient = postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
});
export const db = drizzle(queryClient, { schema });

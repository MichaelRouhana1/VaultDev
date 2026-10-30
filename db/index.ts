import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For query purposes
// One warm instance should not open a pile of Supabase pooler connections.
// A few is enough for Promise.all in a single admin render; extra queries wait in-process.
const queryClient = postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase 6543 is a transaction-mode pooler: no named prepared statements.
    prepare: false,
    // postgres-js pipelines queued queries onto a busy connection once `max` is reached
    // (default max_pipeline 100; even 1 still allows "active + 1 sent"). Through the
    // transaction pooler a parameterized statement pipelined behind a parameter-less one
    // is never answered: the backend sits `active` / wait_event `Client` and the request
    // hangs forever. Renders that fan out more than `max` queries (admin dashboard,
    // product edit) hit this. 0 disables pipelining so each connection carries exactly
    // one statement at a time. Needs patches/postgres+3.4.8.patch, otherwise sql.begin
    // (drizzle transactions) breaks with UNSAFE_TRANSACTION when pipelining is off.
    max_pipeline: 0,
});
export const db = drizzle(queryClient, { schema });

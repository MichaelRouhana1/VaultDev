import { cookies } from "next/headers";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
    storeType?: string;
    userId?: string | null;
    error?: unknown;
    [key: string]: unknown;
}

async function getAutoContext(): Promise<Partial<LogContext>> {
    const autoContext: Partial<LogContext> = {};
    try {
        const cookieStore = await cookies();
        const adminStore = cookieStore.get("adminStore")?.value;
        if (adminStore) {
            autoContext.storeType = adminStore;
        }
    } catch {
        // Might not be in a request context, safely ignore
    }
    return autoContext;
}

function parseError(error: unknown) {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
            name: error.name,
        };
    }
    return String(error);
}

async function log(level: LogLevel, message: string, context?: LogContext) {
    const autoContext = await getAutoContext();

    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: {
            ...autoContext,
            ...context,
        },
    };

    const jsonString = JSON.stringify(logEntry);

    switch (level) {
        case "info":
            console.log(jsonString);
            break;
        case "warn":
            console.warn(jsonString);
            break;
        case "error":
            console.error(jsonString);
            break;
    }
}

export const logger = {
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
        log("error", message, { ...context, error: parseError(error) }),
};


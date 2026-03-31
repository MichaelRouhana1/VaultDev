import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getAdminNotifications } from "@/actions/adminNotifications";
import { MarkAllNotificationsReadButton } from "@/components/admin/MarkAllNotificationsReadButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Notifications | VAULT Admin",
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return String(d);
  }
}

export default async function AdminNotificationsPage() {
  const result = await getAdminNotifications();
  if (!result.ok) {
    return redirect({ href: "/", locale: await getLocale() });
  }

  const unreadCount = result.items.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Low stock and other alerts from storefront activity.
            {unreadCount > 0 && (
              <span className="ml-1 font-medium text-foreground">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <MarkAllNotificationsReadButton disabled={unreadCount === 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbox</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-border px-0 pb-0">
          {result.items.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-10 text-center">
              No notifications yet. Low stock alerts appear here after checkout when inventory drops
              below 5 units.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {result.items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-6 py-4 text-sm transition-colors",
                    !n.isRead && "bg-muted/40 border-l-4 border-l-amber-500",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p
                        className={cn(
                          "leading-snug",
                          !n.isRead ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {n.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDate(n.createdAt)}</span>
                        <span className="uppercase tracking-wider">{n.type}</span>
                        {n.productId != null && (
                          <Link
                            href={`/admin/products/${n.productId}/edit`}
                            className="text-foreground underline-offset-4 hover:underline"
                          >
                            Edit product
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.isRead && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                        Unread
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

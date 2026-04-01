import { SignIn } from "@clerk/nextjs";
import { SignInFailureAuditObserver } from "@/components/SignInFailureAuditObserver";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const path = `/${locale}/sign-in`;
  const accountPath = `/${locale}/account`;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-zinc-50 via-neutral-50 to-zinc-100 px-4 py-12 font-sans antialiased text-foreground">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.9),transparent)]"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <SignInFailureAuditObserver />
        <SignIn
          appearance={mosaikClerkAppearance}
          routing="path"
          path={path}
          fallbackRedirectUrl={accountPath}
        />
      </div>
    </div>
  );
}

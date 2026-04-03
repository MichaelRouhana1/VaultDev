import { SignUp } from "@clerk/nextjs";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const path = `/${locale}/sign-up`;
  const accountPath = `/${locale}/account`;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-mosaik-gray-soft px-4 py-12 font-sans antialiased text-mosaik-black">
      <div className="flex w-full max-w-md flex-col items-center">
        <SignUp
          appearance={mosaikClerkAppearance}
          routing="path"
          path={path}
          fallbackRedirectUrl={accountPath}
        />
      </div>
    </div>
  );
}

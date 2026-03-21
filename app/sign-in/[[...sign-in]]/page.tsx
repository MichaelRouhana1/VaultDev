import { SignIn } from "@clerk/nextjs";
import { SignInFailureAuditObserver } from "@/components/SignInFailureAuditObserver";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4 font-sans text-[#000000]">
      <SignInFailureAuditObserver />
      <SignIn
        appearance={mosaikClerkAppearance}
        routing="path"
        path="/sign-in"
      />
    </div>
  );
}

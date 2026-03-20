import { SignIn } from "@clerk/nextjs";
import { SignInFailureAuditObserver } from "@/components/SignInFailureAuditObserver";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignInFailureAuditObserver />
      <SignIn />
    </div>
  );
}

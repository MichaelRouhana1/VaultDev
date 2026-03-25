import { SignUp } from "@clerk/nextjs";
import { mosaikClerkAppearance } from "@/lib/clerk-auth-appearance";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4 font-sans text-[#000000]">
      <SignUp
        appearance={mosaikClerkAppearance}
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl="/account"
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSignIn } from "@clerk/nextjs";
import { registerFromOrder } from "@/actions/registerFromOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface GuestPasswordRegistrationFormProps {
  orderId: number;
  activationToken: string;
  email: string;
  /** First name for welcome copy (activate-account flow). */
  welcomeName?: string;
  variant?: "success" | "activate";
}

export function GuestPasswordRegistrationForm({
  orderId,
  activationToken,
  email,
  welcomeName,
  variant = "success",
}: GuestPasswordRegistrationFormProps) {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) {
      toast.error("Authentication is still loading. Try again.");
      return;
    }

    setPending(true);
    try {
      const result = await registerFromOrder({ orderId, activationToken, password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.userExisted) {
        toast.success("Your orders are linked. Sign in with your existing password.");
        router.push("/sign-in");
        return;
      }

      const attempt = await signIn.create({
        identifier: result.email,
        password,
      });

      if (attempt.status === "complete" && attempt.createdSessionId && setActive) {
        await setActive({ session: attempt.createdSessionId });
        toast.success("Welcome! You’re signed in.");
        router.push("/account");
        router.refresh();
        return;
      }

      toast.success("Account created. Please sign in.");
      router.push("/sign-in");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Try signing in manually.");
      router.push("/sign-in");
    } finally {
      setPending(false);
    }
  }

  const title =
    variant === "activate"
      ? `Welcome${welcomeName ? `, ${welcomeName}` : ""}!`
      : "Track your order";

  const description =
    variant === "activate"
      ? "Set a password to view your order history and save your details."
      : "Create a password to save your details and see this order in your account.";

  return (
    <Card className="w-full max-w-md text-left border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium break-all">{email}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-register-password">Password</Label>
            <Input
              id="guest-register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending || !isLoaded}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

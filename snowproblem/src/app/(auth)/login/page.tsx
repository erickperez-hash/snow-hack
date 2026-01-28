import { Metadata } from "next";
import Link from "next/link";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Snowflake } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In - SnowProblem",
  description: "Sign in to your SnowProblem account",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Snowflake className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to SnowProblem</CardTitle>
            <CardDescription className="mt-2">
              Connect with local snow removal services or find jobs in your area
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <SocialLoginButtons />

          <div className="text-center text-sm text-muted-foreground">
            <p>
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-primary">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-primary">
                Privacy Policy
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

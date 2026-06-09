import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LOGIN_ERROR_MESSAGES, isGoogleAuthEnabled } from "@/lib/google-auth";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;
  const authError = error ? (LOGIN_ERROR_MESSAGES[error] ?? LOGIN_ERROR_MESSAGES.AccessDenied) : null;

  return (
    <div className="w-full">
      <Card className="mx-auto w-full max-w-md text-center">
        <div className="flex flex-col items-center">
          <Image
            src="/meavo-logo.png"
            alt="Meavo"
            width={96}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
        <p className="mt-4 text-slate-600">
          Sign in to access your company tools and apps.
        </p>
        <LoginForm googleEnabled={isGoogleAuthEnabled()} authError={authError} />
      </Card>
    </div>
  );
}

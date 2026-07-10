"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { isLoginThrottled, loginThrottleKey, THROTTLE_ERROR } from "@/lib/login-throttle";

type LoginState = { error?: string; ok?: boolean } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Pre-check for a friendly message; the credentials provider enforces the
  // throttle (and records failures / clears on success) authoritatively.
  const throttleKey = loginThrottleKey(email);
  if (await isLoginThrottled(throttleKey)) {
    return { error: THROTTLE_ERROR };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Invalid email or password." };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    console.error("Login failed:", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

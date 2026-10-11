import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import type { User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
  scheme: "phoenixenterprisemobile",
  path: "auth/callback",
});

async function finishSignIn(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new Error(errorCode);

  if (typeof params.code === "string") {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return;
  }

  if (
    typeof params.access_token === "string" &&
    typeof params.refresh_token === "string"
  ) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return;
  }

  throw new Error("Sign-in returned no session. Please try again.");
}

export default function GoogleSignInButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handlePress() {
    setLoading(true);

    try {
      if (user) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("Could not start Google sign-in.");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      if (result.type === "success") {
        await finishSignIn(result.url);
      }
    } catch (error) {
      Alert.alert(
        "Sign-in problem",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const label = loading
    ? "Please wait…"
    : user
      ? `Sign out (${user.email ?? "account"})`
      : "Sign in with Google";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={handlePress}
      style={styles.button}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 9,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
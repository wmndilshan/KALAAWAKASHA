import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, commonStyles, shadow } from "../lib/theme";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert("Login failed", error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandCard}>
        <Text style={styles.brand}>KalaAwakasha</Text>
        <Text style={styles.brandSub}>Organizer gate access</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.copy}>Use your organizer account to manage ticket verification.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={commonStyles.input}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          style={commonStyles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
        />
        <Pressable onPress={onLogin} style={commonStyles.primaryButton} disabled={loading}>
          <Text style={commonStyles.primaryButtonText}>{loading ? "Signing in..." : "Sign In"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: colors.mist, gap: 16 },
  brandCard: { backgroundColor: colors.ink, borderRadius: 24, padding: 22, minHeight: 150, justifyContent: "flex-end", ...shadow },
  brand: { color: colors.white, fontSize: 34, fontWeight: "900" },
  brandSub: { color: "rgba(255,255,255,0.72)", marginTop: 4, fontWeight: "700" },
  panel: { ...commonStyles.card, gap: 12 },
  title: { fontSize: 24, fontWeight: "900", color: colors.ink },
  copy: { color: colors.muted, lineHeight: 20 },
});

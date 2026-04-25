import { StyleSheet } from "react-native";

export const colors = {
  mist: "#f7f4ed",
  ink: "#1d2a36",
  ember: "#c4411f",
  pine: "#2f5d50",
  sage: "#ddece6",
  gold: "#f1b64c",
  white: "#ffffff",
  muted: "#66727c",
  line: "rgba(29, 42, 54, 0.12)",
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
};

export const shadow = {
  shadowColor: "#1d2a36",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mist,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    ...shadow,
  },
  input: {
    minHeight: 50,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 46,
    backgroundColor: colors.sage,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export function statusColor(status?: string) {
  if (status === "checked_in") return colors.pine;
  if (status === "cancelled") return colors.ember;
  return colors.gold;
}

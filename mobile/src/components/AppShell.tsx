import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, commonStyles } from "../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
};

export function AppShell({ title, subtitle, right, children, scroll = true }: Props) {
  const body = (
    <View style={commonStyles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={commonStyles.eyebrow}>KalaAwakasha Tickets</Text>
          <Text style={commonStyles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );

  if (!scroll) {
    return <View style={commonStyles.screen}>{body}</View>;
  }

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={styles.scrollContent}>
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 14,
  },
});

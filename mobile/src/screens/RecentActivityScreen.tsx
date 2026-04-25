import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { colors, commonStyles } from "../lib/theme";

type Row = {
  id: string;
  action: string;
  message: string | null;
  created_at: string;
};

export function RecentActivityScreen() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("checkin_logs")
        .select("id,action,message,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      setRows(data ?? []);
    };

    void load();
  }, []);

  return (
    <AppShell title="Activity" subtitle="Latest organizer and gate events." scroll={false}>
      <FlatList
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.actionRow}>
              <Text style={styles.bold}>{item.action.replace("_", " ")}</Text>
              <View style={styles.activityDot} />
            </View>
            <Text style={styles.message}>{item.message ?? "-"}</Text>
            <Text style={styles.small}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 150 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
  card: { ...commonStyles.card, gap: 6 },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bold: { color: colors.ink, fontWeight: "900", textTransform: "capitalize" },
  activityDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.pine },
  message: { color: colors.ink },
  small: { color: colors.muted, fontSize: 12, marginTop: 2 },
});

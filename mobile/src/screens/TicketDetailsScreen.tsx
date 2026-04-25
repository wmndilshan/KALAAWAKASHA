import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { AppShell } from "../components/AppShell";
import { formatStudentIdFull } from "../lib/code";
import { RootStackParamList } from "../lib/navigation";
import { supabase } from "../lib/supabase";
import { Ticket, TicketStatus } from "../lib/types";
import { colors, commonStyles, statusColor } from "../lib/theme";

type Props = {
  route: RouteProp<RootStackParamList, "TicketDetails">;
};

export function TicketDetailsScreen({ route }: Props) {
  const { ticketId } = route.params;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
    setTicket(data);

    if (data?.photo_path) {
      const { data: signed } = await supabase.storage.from("ticket-photos").createSignedUrl(data.photo_path, 300);
      setPhotoUrl(signed?.signedUrl ?? null);
    } else {
      setPhotoUrl(null);
    }
  };

  useEffect(() => {
    void load();
  }, [ticketId]);

  const updateStatus = async (status: TicketStatus) => {
    if (!ticket) return;
    setUpdating(true);

    const patch =
      status === "checked_in"
        ? { status, checked_in_at: new Date().toISOString() }
        : { status, checked_in_at: null, checked_in_by: null };

    const { data, error } = await supabase.from("tickets").update(patch).eq("id", ticket.id).select("*").single();

    setUpdating(false);

    if (error || !data) {
      Alert.alert("Status update failed", error?.message ?? "Could not update ticket status.");
      return;
    }

    setTicket(data as Ticket);
  };

  if (!ticket) {
    return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;
  }

  return (
    <AppShell title="Ticket Details" subtitle="Review the issued record and status.">
      <View style={styles.card}>
        <View style={styles.topLine}>
          <Text style={styles.bold}>{formatStudentIdFull(ticket.student_id_full)}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(ticket.status) }]}>
            <Text style={styles.statusText}>{ticket.status.replace("_", " ")}</Text>
          </View>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.label}>Ticket</Text>
            <Text style={styles.value}>#{ticket.ticket_no}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.label}>Code</Text>
            <Text style={styles.value}>{ticket.verify_code}</Text>
          </View>
        </View>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Status</Text>
        <View style={styles.statusActions}>
          {(["issued", "checked_in", "cancelled"] as TicketStatus[]).map((item) => {
            const active = ticket.status === item;
            return (
              <Pressable
                key={item}
                style={[styles.statusButton, active ? { backgroundColor: statusColor(item), borderColor: statusColor(item) } : null]}
                onPress={() => updateStatus(item)}
                disabled={updating || active}
              >
                <Text style={[styles.statusButtonText, active ? styles.statusButtonTextActive : null]}>
                  {item.replace("_", " ")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.statusHint}>{updating ? "Updating status..." : "Tap a status to update this ticket."}</Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist, padding: 16 },
  loading: { color: colors.muted },
  card: { ...commonStyles.card, gap: 14 },
  topLine: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  bold: { color: colors.ink, fontWeight: "900", fontSize: 22, flex: 1 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: colors.white, fontWeight: "900", fontSize: 11, textTransform: "uppercase" },
  infoGrid: { flexDirection: "row", gap: 10 },
  infoCell: { flex: 1, backgroundColor: colors.mist, borderRadius: 14, padding: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  value: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 4 },
  photo: { marginTop: 2, height: 180, borderRadius: 16 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  statusButtonText: { color: colors.ink, fontWeight: "900", textTransform: "capitalize" },
  statusButtonTextActive: { color: colors.white },
  statusHint: { color: colors.muted, fontSize: 12 },
});

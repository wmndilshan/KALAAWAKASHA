import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { invoke } from "../lib/api";
import { formatStudentIdFull } from "../lib/code";
import { supabase } from "../lib/supabase";
import { VerifyResponse } from "../lib/types";
import { colors, commonStyles, shadow } from "../lib/theme";

export function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionTitle}>Camera Permission</Text>
        <Text style={styles.info}>Camera access is required for QR ticket scanning.</Text>
        <Pressable style={commonStyles.primaryButton} onPress={() => requestPermission()}>
          <Text style={commonStyles.primaryButtonText}>Grant Camera Permission</Text>
        </Pressable>
      </View>
    );
  }

  const verifyByQR = async (raw: string) => {
    if (locked) return;
    setLocked(true);

    try {
      const out = await invoke<VerifyResponse>("verify-ticket-v2", { qr_payload: raw });
      setResult(out);

      if (out.ticket?.photo_path) {
        const { data } = await supabase.storage.from("ticket-photos").createSignedUrl(out.ticket.photo_path, 300);
        setPhotoUrl(data?.signedUrl ?? null);
      } else {
        setPhotoUrl(null);
      }
    } catch (error) {
      Alert.alert("Verification failed", (error as Error).message);
    }
  };

  const onCheckIn = async () => {
    if (!result?.ticket?.id) return;
    const out = await invoke<{ checked_in: boolean; error?: string }>("check-in-ticket-open", {
      ticket_id: result.ticket.id,
    });
    Alert.alert(out.checked_in ? "Success" : "Check-in blocked", out.error ?? "Checked in");
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={(event) => void verifyByQR(event.data)}
        />
        <View style={styles.scanFrame} pointerEvents="none" />
        <View style={styles.cameraLabel}>
          <Text style={styles.cameraLabelText}>{locked ? "Result locked" : "Align ticket QR"}</Text>
        </View>
      </View>

      <Pressable style={styles.resetButton} onPress={() => { setLocked(false); setResult(null); setPhotoUrl(null); }}>
        <Text style={commonStyles.primaryButtonText}>Scan Next</Text>
      </Pressable>

      {result ? (
        <View style={styles.resultCard}>
          <Text style={[styles.resultText, { color: result.valid ? colors.pine : colors.ember }]}>
            {result.valid ? "Valid Ticket" : result.duplicate ? "Duplicate" : "Invalid Ticket"}
          </Text>
          <Text style={styles.ticketId}>{result.ticket ? formatStudentIdFull(result.ticket.student_id_full) : result.error}</Text>
          <Text style={styles.meta}>Ticket #{result.ticket?.ticket_no ?? "-"} · {result.ticket?.status ?? "not found"}</Text>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
          {result.valid && result.ticket?.status === "issued" ? (
            <Pressable style={styles.button} onPress={onCheckIn}>
              <Text style={commonStyles.primaryButtonText}>Confirm Check-in</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist, padding: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: colors.mist, gap: 12 },
  permissionTitle: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  cameraWrap: { flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: colors.ink, ...shadow },
  camera: { flex: 1 },
  scanFrame: {
    position: "absolute",
    left: "14%",
    right: "14%",
    top: "28%",
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.gold,
  },
  cameraLabel: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "rgba(29,42,54,0.78)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cameraLabelText: { color: colors.white, fontWeight: "900" },
  resultCard: { ...commonStyles.card, marginTop: 10, gap: 6 },
  resultText: { fontWeight: "900", fontSize: 20 },
  ticketId: { color: colors.ink, fontWeight: "900", fontSize: 18 },
  meta: { color: colors.muted },
  info: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  photo: { height: 150, borderRadius: 14, marginTop: 8 },
  button: { ...commonStyles.primaryButton, marginTop: 8, backgroundColor: colors.pine },
  resetButton: { ...commonStyles.primaryButton, marginTop: 8 },
});

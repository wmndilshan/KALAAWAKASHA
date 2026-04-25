import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AppShell } from "../components/AppShell";
import {
  buildQrPayload,
  buildStudentIdFull,
  formatStudentIdFull,
  formatStudentSerial,
  generateCodeClient,
  parseStudentId,
} from "../lib/code";
import { supabase } from "../lib/supabase";
import { Ticket } from "../lib/types";
import { colors, commonStyles } from "../lib/theme";

const FACULTIES = [
  { code: "M", label: "Medicine" },
  { code: "V", label: "Veterinary Medicine" },
  { code: "MG", label: "Management" },
  { code: "AG", label: "Agriculture" },
  { code: "A", label: "Arts" },
  { code: "D", label: "Dental Sciences" },
  { code: "AH", label: "Allied Health Sciences" },
  { code: "S", label: "Science" },
];

const BATCHES = ["19", "20", "21", "22", "23", "24", "25"];
const SUB_DEPARTMENTS: Record<string, string[]> = {
  A: ["LLB", "SW", "GIS", "AI"],
  AH: ["PHY", "PCY", "NUR", "RAD", "MLS"],
  AG: ["ASF", "FST"],
};

export function AddTicketScreen() {
  const [facultyCode, setFacultyCode] = useState("M");
  const [batch, setBatch] = useState("20");
  const [subDepartment, setSubDepartment] = useState("");
  const [studentSerial, setStudentSerial] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [selector, setSelector] = useState<"faculty" | "batch" | "subDepartment" | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Ticket | null>(null);
  const requiresSubDepartment = facultyCode === "AH";
  const showNoSubDepartmentOption = facultyCode !== "AH";

  const createTicket = async () => {
    if (!ticketNo.trim()) {
      Alert.alert("Missing details", "Enter the ticket number.");
      return;
    }

    if (!studentSerial.trim()) {
      Alert.alert("Missing details", "Enter the student number and ticket number.");
      return;
    }

    if (requiresSubDepartment && !subDepartment.trim()) {
      Alert.alert("Missing details", "Select the department.");
      return;
    }

    const ticketNoNumber = Number(ticketNo);
    if (!Number.isInteger(ticketNoNumber) || ticketNoNumber < 1 || ticketNoNumber > 3500) {
      Alert.alert("Invalid ticket", "Ticket number must be between 1 and 3500.");
      return;
    }

    setLoading(true);
    setCreated(null);

    try {
      const studentIdRaw = buildStudentIdFull({
        facultyCode,
        batch,
        subDepartment,
        studentSerial,
      });
      const parsedStudent = parseStudentId(studentIdRaw);
      const studentIdFull = parsedStudent.studentIdFull;

      const { data: duplicateStudent, error: studentCheckError } = await supabase
        .from("tickets")
        .select("id, ticket_no, status")
        .eq("student_id_full", studentIdFull)
        .maybeSingle();

      if (studentCheckError) {
        throw studentCheckError;
      }

      if (duplicateStudent) {
        if (duplicateStudent.status !== "cancelled") {
          Alert.alert("Already issued", `${formatStudentIdFull(studentIdFull)} already has ticket #${duplicateStudent.ticket_no}.`);
          return;
        }

        const { data: ticketConflict, error: ticketConflictError } = await supabase
          .from("tickets")
          .select("id, student_id_full, status")
          .eq("ticket_no", ticketNoNumber)
          .neq("id", duplicateStudent.id)
          .neq("status", "cancelled")
          .maybeSingle();

        if (ticketConflictError) {
          throw ticketConflictError;
        }

        if (ticketConflict) {
          Alert.alert("Ticket number used", `Ticket #${ticketNoNumber} is already issued to ${formatStudentIdFull(ticketConflict.student_id_full)}.`);
          return;
        }

        const verifyCode = await generateCodeClient(
          parsedStudent.facultyCode,
          parsedStudent.batch,
          parsedStudent.studentKey,
          ticketNoNumber,
        );
        const qrPayload = buildQrPayload(studentIdFull, ticketNoNumber, verifyCode);

        const { data: revived, error: reviveError } = await supabase
          .from("tickets")
          .update({
            faculty_code: parsedStudent.facultyCode,
            batch: parsedStudent.batch,
            student_serial: parsedStudent.studentSerial,
            ticket_no: ticketNoNumber,
            verify_code: verifyCode,
            qr_payload: qrPayload,
            status: "issued",
            checked_in_at: null,
            checked_in_by: null,
          })
          .eq("id", duplicateStudent.id)
          .select("*")
          .single();

        if (reviveError || !revived) {
          throw new Error(reviveError?.message ?? "Ticket was not re-issued");
        }

        setCreated(revived as Ticket);
        setSubDepartment("");
        setStudentSerial("");
        setTicketNo("");
        return;
      }

      const { data: duplicateTicket, error: ticketCheckError } = await supabase
        .from("tickets")
        .select("id, student_id_full")
        .eq("ticket_no", ticketNoNumber)
        .maybeSingle();

      if (ticketCheckError) {
        throw ticketCheckError;
      }

      if (duplicateTicket) {
        Alert.alert("Ticket number used", `Ticket #${ticketNoNumber} is already issued to ${formatStudentIdFull(duplicateTicket.student_id_full)}.`);
        return;
      }

      const verifyCode = await generateCodeClient(
        parsedStudent.facultyCode,
        parsedStudent.batch,
        parsedStudent.studentKey,
        ticketNoNumber,
      );
      const qrPayload = buildQrPayload(studentIdFull, ticketNoNumber, verifyCode);

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          student_id_full: studentIdFull,
          faculty_code: parsedStudent.facultyCode,
          batch: parsedStudent.batch,
          student_serial: parsedStudent.studentSerial,
          ticket_no: ticketNoNumber,
          verify_code: verifyCode,
          qr_payload: qrPayload,
          photo_path: null,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Ticket was not created");
      }

      setCreated(data as Ticket);
      setSubDepartment("");
      setStudentSerial("");
      setTicketNo("");
    } catch (error) {
      Alert.alert("Could not create ticket", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Add Ticket" subtitle="Create a new issued ticket record.">
      <View style={styles.formCard}>
        <View style={styles.studentIdRow}>
          <Pressable style={[styles.selectField, styles.facultyField]} onPress={() => setSelector("faculty")}>
            <Text style={styles.fieldLabel}>Faculty</Text>
            <Text style={styles.selectValue}>{facultyCode}</Text>
          </Pressable>
          <Pressable style={styles.selectField} onPress={() => setSelector("batch")}>
            <Text style={styles.fieldLabel}>Batch</Text>
            <Text style={styles.selectValue}>{batch}</Text>
          </Pressable>
          {facultyCode === "A" || facultyCode === "AH" || facultyCode === "AG" ? (
            <Pressable style={[styles.selectField, styles.departmentField]} onPress={() => setSelector("subDepartment")}>
              <Text style={styles.fieldLabel}>Department</Text>
              <Text style={styles.selectValue}>{subDepartment || (facultyCode === "AH" ? "Select" : "No sub department")}</Text>
            </Pressable>
          ) : null}
          <View style={[styles.selectField, styles.numberField]}>
            <Text style={styles.fieldLabel}>Student No</Text>
            <TextInput
              style={styles.inlineInput}
              value={studentSerial}
              onChangeText={(value) => setStudentSerial(value.replace(/\D/g, "").slice(0, 3))}
              placeholder="455"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
          </View>
        </View>

        <TextInput
          style={commonStyles.input}
          value={ticketNo}
          onChangeText={(value) => setTicketNo(value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Ticket number (1-3500)"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
        />

        <Text style={styles.photoNote}>Ticket photo is optional and skipped on mobile.</Text>

        <Pressable style={commonStyles.primaryButton} onPress={createTicket} disabled={loading}>
          <Text style={commonStyles.primaryButtonText}>{loading ? "Issuing..." : "Issue Ticket"}</Text>
        </Pressable>
      </View>

      {created ? (
        <View style={styles.createdCard}>
          <Text style={styles.createdTitle}>Ticket Created</Text>
          <Text style={styles.createdStudent}>{formatStudentIdFull(created.student_id_full)}</Text>
          <Text style={styles.meta}>Student number: {formatStudentSerial(created.student_serial)}</Text>
          <Text style={styles.meta}>Ticket #{created.ticket_no}</Text>
          <View style={styles.codePanel}>
            <Text style={styles.codeLabel}>4-digit code</Text>
            <Text style={styles.code}>{created.verify_code}</Text>
          </View>
          {created.qr_payload ? (
            <View style={styles.qrBox}>
              <QRCode value={created.qr_payload} size={190} backgroundColor={colors.white} color={colors.ink} />
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal visible={selector !== null} transparent animationType="slide" onRequestClose={() => setSelector(null)}>
        <View style={styles.modalShade}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelector(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selector === "faculty" ? "Select Faculty" : "Select Batch"}</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {(selector === "faculty" ? FACULTIES : BATCHES).map((item) => {
                const value = typeof item === "string" ? item : item.code;
                const label = typeof item === "string" ? `Batch ${item}` : item.label;
                const active = selector === "faculty" ? facultyCode === value : batch === value;

                return (
                  <Pressable
                    key={value}
                    style={[styles.option, active ? styles.optionActive : null]}
                    onPress={() => {
                      if (selector === "faculty") {
                        setFacultyCode(value);
                        setSubDepartment("");
                        setStudentSerial("");
                      } else {
                        setBatch(value);
                      }
                      setSelector(null);
                    }}
                  >
                    <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{label}</Text>
                    <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>{value}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={selector === "subDepartment"} transparent animationType="slide" onRequestClose={() => setSelector(null)}>
        <View style={styles.modalShade}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelector(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Department</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {showNoSubDepartmentOption ? (
                <Pressable style={[styles.option, !subDepartment ? styles.optionActive : null]} onPress={() => { setSubDepartment(""); setSelector(null); }}>
                  <Text style={[styles.optionText, !subDepartment ? styles.optionTextActive : null]}>No sub department</Text>
                  <Text style={[styles.optionCode, !subDepartment ? styles.optionTextActive : null]}>Default</Text>
                </Pressable>
              ) : null}
              {(SUB_DEPARTMENTS[facultyCode] ?? []).map((dep) => {
                const active = subDepartment === dep;
                return (
                  <Pressable
                    key={dep}
                    style={[styles.option, active ? styles.optionActive : null]}
                    onPress={() => {
                      setSubDepartment(dep);
                      setSelector(null);
                    }}
                  >
                    <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{dep}</Text>
                    <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>Select</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  formCard: { ...commonStyles.card, gap: 10 },
  studentIdRow: { flexDirection: "row", gap: 8 },
  selectField: {
    flex: 0.84,
    minHeight: 58,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
  },
  facultyField: { flex: 0.9 },
  departmentField: { flex: 1 },
  numberField: { flex: 1.2 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  selectValue: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  inlineInput: { color: colors.ink, fontSize: 16, fontWeight: "900", minHeight: 26, padding: 0, marginTop: 1 },
  photoNote: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  createdCard: { ...commonStyles.card, gap: 5 },
  createdTitle: { color: colors.pine, fontSize: 18, fontWeight: "900" },
  createdStudent: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  meta: { color: colors.muted },
  codePanel: { backgroundColor: colors.sage, borderRadius: 16, padding: 12, marginTop: 4 },
  codeLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  code: { color: colors.pine, fontSize: 32, fontWeight: "900", marginTop: 2 },
  qrBox: { alignSelf: "center", backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 8 },
  modalShade: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(29,42,54,0.38)" },
  sheet: { maxHeight: "75%", backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 12 },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: colors.line, alignSelf: "center" },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  optionList: { gap: 8, paddingBottom: 12 },
  option: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: colors.ink, fontWeight: "900" },
  optionCode: { color: colors.muted, fontWeight: "900" },
  optionTextActive: { color: colors.white },
});

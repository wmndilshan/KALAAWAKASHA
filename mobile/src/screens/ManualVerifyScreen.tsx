import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppShell } from "../components/AppShell";
import { buildStudentIdFull, formatStudentIdFull } from "../lib/code";
import { supabase } from "../lib/supabase";
import { Ticket, TicketStatus } from "../lib/types";
import { colors, commonStyles, statusColor } from "../lib/theme";

type SearchMode = "reg" | "ticket" | "code";

const SEARCH_MODES: { key: SearchMode; label: string }[] = [
  { key: "reg", label: "Reg Number" },
  { key: "ticket", label: "Ticket Number" },
  { key: "code", label: "4-digit Code" },
];

const FACULTIES = [
  { code: "M", label: "Medicine" },
  { code: "V", label: "Veterinary" },
  { code: "MG", label: "Management" },
  { code: "AG", label: "Agriculture" },
  { code: "A", label: "Arts" },
  { code: "D", label: "Dental" },
  { code: "AH", label: "Allied Health" },
  { code: "S", label: "Science" },
];

const BATCHES = ["19", "20", "21", "22", "23", "24", "25"];
const SUB_DEPARTMENTS: Record<string, string[]> = {
  A: ["LLB", "SW", "GIS", "AI"],
  AH: ["PHY", "PCY", "NUR", "RAD", "MLS"],
  AG: ["ASF", "FST"],
};

type RegSelector = "faculty" | "batch" | "subDepartment";

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function RecordField({
  label,
  value,
  wide = false,
  monospace = false,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
  monospace?: boolean;
}) {
  const text = value === null || value === undefined || value === "" ? "-" : String(value);

  return (
    <View style={[styles.detailCell, wide ? styles.detailCellWide : null]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, monospace ? styles.monospaceValue : null]}>{text}</Text>
    </View>
  );
}

export function ManualVerifyScreen() {
  const [searchMode, setSearchMode] = useState<SearchMode>("reg");
  const [facultyCode, setFacultyCode] = useState("M");
  const [batch, setBatch] = useState("20");
  const [subDepartment, setSubDepartment] = useState("");
  const [regStudentNumber, setRegStudentNumber] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [regSelector, setRegSelector] = useState<RegSelector | null>(null);
  const requiresSubDepartment = facultyCode === "AH";
  const showNoSubDepartmentOption = facultyCode !== "AH";

  const selectSearchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setRows([]);
    setSearched(false);
  };

  const selectRegFaculty = (value: string) => {
    setFacultyCode(value);
    setSubDepartment("");
    setRegStudentNumber("");
    setRegSelector(null);
  };

  const selectRegBatch = (value: string) => {
    setBatch(value);
    setRegSelector(null);
  };

  const selectRegSubDepartment = (value: string) => {
    setSubDepartment(value);
    setRegSelector(null);
  };

  const updateRowStatus = async (ticket: Ticket, status: TicketStatus) => {
    const updatedTicket = await updateTicketStatus(ticket, status);
    if (updatedTicket) {
      setRows((current) => current.map((row) => (row.id === updatedTicket.id ? updatedTicket : row)));
    }
  };

  const updateTicketStatus = async (ticket: Ticket, status: TicketStatus) => {
    if (ticket.status === status) return ticket;

    const patch =
      status === "checked_in"
        ? { status, checked_in_at: new Date().toISOString() }
        : { status, checked_in_at: null, checked_in_by: null };

    const { data, error } = await supabase.from("tickets").update(patch).eq("id", ticket.id).select("*").single();

    if (error || !data) {
      Alert.alert("Status update failed", error?.message ?? "Could not update ticket status.");
      return null;
    }

    return data as Ticket;
  };

  const searchRecords = async () => {
    if (searchMode === "reg" && !regStudentNumber.trim()) {
      Alert.alert("Missing details", "Enter the student number.");
      return;
    }

    if (searchMode === "reg" && requiresSubDepartment && !subDepartment.trim()) {
      Alert.alert("Missing details", "Select the department.");
      return;
    }

    if (searchMode === "ticket" && !ticketNo.trim()) {
      Alert.alert("Missing details", "Enter the ticket number.");
      return;
    }

    if (searchMode === "code" && !/^\d{1,4}$/.test(code)) {
      Alert.alert("Invalid code", "Enter up to 4 digits.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      if (searchMode === "reg") {
        let normalized = "";

        try {
          normalized = buildStudentIdFull({
            facultyCode,
            batch,
            subDepartment,
            studentSerial: regStudentNumber,
          });
        } catch (error) {
          Alert.alert("Invalid registration number", (error as Error).message);
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("student_id_full", normalized)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        setRows(data ?? []);
        return;
      }

      if (searchMode === "ticket") {
        const ticketNumber = Number(ticketNo);
        if (!Number.isInteger(ticketNumber) || ticketNumber < 1 || ticketNumber > 3500) {
          Alert.alert("Invalid ticket", "Ticket number must be between 1 and 3500.");
          setRows([]);
          return;
        }

        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("ticket_no", ticketNumber)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        setRows(data ?? []);
        return;
      }

      const normalizedCode = code.padStart(4, "0");
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("verify_code", normalizedCode)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setRows(data ?? []);
    } catch (error) {
      Alert.alert("Search failed", (error as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Manual Verify" subtitle="Search by Reg Number, Ticket Number, or 4-digit Code.">
      <View style={styles.formCard}>
        <View style={styles.modeRow}>
          {SEARCH_MODES.map((mode) => (
            <Pressable
              key={mode.key}
              style={[styles.modePill, searchMode === mode.key ? styles.modePillActive : null]}
              onPress={() => selectSearchMode(mode.key)}
            >
              <Text style={[styles.modeText, searchMode === mode.key ? styles.modeTextActive : null]}>{mode.label}</Text>
            </Pressable>
          ))}
        </View>

        {searchMode === "reg" ? (
          <View style={styles.regPanel}>
            <View style={styles.regRow}>
              <Pressable style={[styles.selectField, styles.facultyField]} onPress={() => setRegSelector("faculty")}>
                <Text style={styles.fieldLabel}>Faculty</Text>
                <Text style={styles.selectValue}>{facultyCode}</Text>
              </Pressable>
              <Pressable style={styles.selectField} onPress={() => setRegSelector("batch")}>
                <Text style={styles.fieldLabel}>Batch</Text>
                <Text style={styles.selectValue}>{batch}</Text>
              </Pressable>
              {facultyCode === "A" || facultyCode === "AH" || facultyCode === "AG" ? (
                <Pressable style={[styles.selectField, styles.departmentField]} onPress={() => setRegSelector("subDepartment")}>
                  <Text style={styles.fieldLabel}>Department</Text>
                  <Text style={styles.selectValue}>{subDepartment || (facultyCode === "AH" ? "Select" : "No sub department")}</Text>
                </Pressable>
              ) : null}
            </View>

            <TextInput
              style={commonStyles.input}
              value={regStudentNumber}
              onChangeText={(value) => setRegStudentNumber(value.replace(/\D/g, "").slice(0, 3))}
              placeholder="Student number"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
          </View>
        ) : null}

        {searchMode === "ticket" ? (
          <TextInput
            style={commonStyles.input}
            value={ticketNo}
            onChangeText={(value) => setTicketNo(value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Ticket number (exact)"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />
        ) : null}

        {searchMode === "code" ? (
          <TextInput
            style={commonStyles.input}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4-digit code (all matches)"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            maxLength={4}
          />
        ) : null}

        <Pressable style={commonStyles.primaryButton} onPress={searchRecords} disabled={loading}>
          <Text style={commonStyles.primaryButtonText}>{loading ? "Searching..." : "Find Records"}</Text>
        </Pressable>
      </View>

      {rows.length ? (
        <View style={styles.resultGroup}>
          <Text style={styles.sectionTitle}>Matches ({rows.length})</Text>
          {rows.map((ticket) => (
            <View key={ticket.id} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleBlock}>
                  <Text style={styles.ticketName}>{formatStudentIdFull(ticket.student_id_full)}</Text>
                  <Text style={styles.recordId} numberOfLines={1}>{ticket.id}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(ticket.status) }]}>
                  <Text style={styles.statusText}>{ticket.status.replace("_", " ")}</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <RecordField label="Reg Number" value={formatStudentIdFull(ticket.student_id_full)} />
                <RecordField label="Ticket Number" value={`#${ticket.ticket_no}`} />
                <RecordField label="4-digit Code" value={ticket.verify_code} />
                <RecordField label="Faculty" value={ticket.faculty_code} />
                <RecordField label="Batch" value={ticket.batch} />
                <RecordField label="Student No" value={ticket.student_serial} />
                <RecordField label="Checked In At" value={formatDateTime(ticket.checked_in_at)} />
                <RecordField label="Checked In By" value={ticket.checked_in_by} />
                <RecordField label="Created" value={formatDateTime(ticket.created_at)} />
                <RecordField label="Updated" value={formatDateTime(ticket.updated_at)} />
                <RecordField label="Photo Path" value={ticket.photo_path} wide monospace />
                <RecordField label="QR Payload" value={ticket.qr_payload} wide monospace />
              </View>

              <View style={styles.statusActions}>
                {(["issued", "checked_in", "cancelled"] as TicketStatus[]).map((item) => {
                  const active = ticket.status === item;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.statusButton, active ? { backgroundColor: statusColor(item), borderColor: statusColor(item) } : null]}
                      onPress={() => updateRowStatus(ticket, item)}
                      disabled={active}
                    >
                      <Text style={[styles.statusButtonText, active ? styles.statusButtonTextActive : null]}>
                        {item.replace("_", " ")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : searched && !loading ? (
        <Text style={styles.noMatches}>No matching records found.</Text>
      ) : null}

      <Modal visible={regSelector !== null} transparent animationType="slide" onRequestClose={() => setRegSelector(null)}>
        <View style={styles.modalShade}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRegSelector(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{regSelector === "faculty" ? "Select Faculty" : regSelector === "batch" ? "Select Batch" : "Select Department"}</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {regSelector === "faculty"
                ? FACULTIES.map((item) => {
                    const active = facultyCode === item.code;
                    return (
                      <Pressable
                        key={item.code}
                        style={[styles.option, active ? styles.optionActive : null]}
                        onPress={() => selectRegFaculty(item.code)}
                      >
                        <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{item.label}</Text>
                        <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>{item.code}</Text>
                      </Pressable>
                    );
                  })
                : regSelector === "batch"
                  ? BATCHES.map((value) => {
                      const active = batch === value;
                      return (
                        <Pressable
                          key={value}
                          style={[styles.option, active ? styles.optionActive : null]}
                          onPress={() => selectRegBatch(value)}
                        >
                          <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>Batch {value}</Text>
                          <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>{value}</Text>
                        </Pressable>
                      );
                    })
                  : (
                      <>
                        {showNoSubDepartmentOption ? (
                          <Pressable style={[styles.option, !subDepartment ? styles.optionActive : null]} onPress={() => selectRegSubDepartment("")}>
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
                              onPress={() => selectRegSubDepartment(dep)}
                            >
                              <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{dep}</Text>
                              <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>Select</Text>
                            </Pressable>
                          );
                        })}
                      </>
                    )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  formCard: { ...commonStyles.card, gap: 10 },
  modeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  regPanel: { gap: 10 },
  regRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  selectValue: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  modePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  modePillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { color: colors.ink, fontWeight: "900", fontSize: 12 },
  modeTextActive: { color: colors.white },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  resultGroup: { gap: 10 },
  resultCard: { ...commonStyles.card, gap: 12 },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  resultTitleBlock: { flex: 1, minWidth: 0 },
  ticketName: { color: colors.ink, fontWeight: "900", fontSize: 18 },
  recordId: { color: colors.muted, fontSize: 11, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: colors.white, fontWeight: "900", fontSize: 11, textTransform: "uppercase" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailCell: {
    width: "48%",
    minHeight: 58,
    backgroundColor: colors.mist,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  detailCellWide: { width: "100%" },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  detailValue: { color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 4 },
  monospaceValue: { fontFamily: "monospace", fontSize: 12 },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
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
  noMatches: { color: colors.muted, textAlign: "center" },
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

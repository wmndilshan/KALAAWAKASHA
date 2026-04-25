import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppShell } from "../components/AppShell";
import { formatStudentIdFull } from "../lib/code";
import { supabase } from "../lib/supabase";
import { Ticket, TicketStatus } from "../lib/types";
import { RootStackParamList } from "../lib/navigation";
import { colors, commonStyles, shadow, statusColor } from "../lib/theme";

const PAGE_SIZE = 10;

const FACULTIES = [
  { code: "all", label: "All" },
  { code: "E", label: "Engineering" },
  { code: "M", label: "Medicine" },
  { code: "V", label: "Veterinary" },
  { code: "MG", label: "Management" },
  { code: "AG", label: "Agriculture" },
  { code: "A", label: "Arts" },
  { code: "D", label: "Dental" },
  { code: "AH", label: "Allied Health" },
  { code: "S", label: "Science" },
] as const;

const BATCHES = [
  { code: "all", label: "All batches" },
  { code: "19", label: "Batch 19" },
  { code: "20", label: "Batch 20" },
  { code: "21", label: "Batch 21" },
  { code: "22", label: "Batch 22" },
  { code: "23", label: "Batch 23" },
  { code: "24", label: "Batch 24" },
  { code: "25", label: "Batch 25" },
] as const;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SearchTicket">;
};

type PhotoFilter = "all" | "with" | "without";

export function SearchTicketScreen({ navigation }: Props) {
  const [ticketNo, setTicketNo] = useState("");
  const [facultyCode, setFacultyCode] = useState("all");
  const [batch, setBatch] = useState("all");
  const [studentSerial, setStudentSerial] = useState("");
  const [hasPhoto, setHasPhoto] = useState<PhotoFilter>("all");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selector, setSelector] = useState<"faculty" | "batch" | null>(null);
  const [rows, setRows] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      issued: rows.filter((row) => row.status === "issued").length,
      checkedIn: rows.filter((row) => row.status === "checked_in").length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
    }),
    [rows],
  );

  const fetchRows = async (nextPage: number, mode: "replace" | "append") => {
    if (loading && mode === "append") return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("tickets")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE - 1);

    if (ticketNo.trim()) {
      query = query.eq("ticket_no", Number(ticketNo));
    }
    if (facultyCode !== "all") {
      query = facultyCode === "A" ? query.in("faculty_code", ["A", "AR"]) : query.eq("faculty_code", facultyCode);
    }
    if (batch !== "all") {
      query = query.eq("batch", batch);
    }
    if (studentSerial.trim()) {
      query = query.eq("student_serial", studentSerial.trim());
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (hasPhoto === "with") {
      query = query.not("photo_path", "is", null);
    }
    if (hasPhoto === "without") {
      query = query.is("photo_path", null);
    }

    const { data, count, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      if (mode === "replace") {
        setRows([]);
        setTotalCount(0);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setRows((current) => (mode === "append" ? [...current, ...(data ?? [])] : data ?? []));
    setTotalCount(count ?? 0);
    setPage(nextPage);
    setFilterOpen(false);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      void fetchRows(1, "replace");
    }, [ticketNo, facultyCode, batch, studentSerial, status, hasPhoto]),
  );

  const runSearch = async () => {
    void fetchRows(1, "replace");
  };

  const refresh = () => {
    setRefreshing(true);
    void fetchRows(1, "replace");
  };

  const loadMore = () => {
    if (rows.length >= totalCount || loading) return;
    void fetchRows(page + 1, "append");
  };

  const clearFilters = () => {
    setTicketNo("");
    setFacultyCode("all");
    setBatch("all");
    setStudentSerial("");
    setHasPhoto("all");
    setStatus("all");
    setTimeout(() => {
      void fetchRows(1, "replace");
    }, 0);
  };

  return (
    <AppShell
      title="Tickets"
      subtitle={`${totalCount} database records`}
      scroll={false}
      right={
        <Pressable style={styles.filterButton} onPress={() => setFilterOpen(true)}>
          <Text style={styles.filterIcon}>≡</Text>
        </Pressable>
      }
    >
      <View style={styles.searchPanel}>
        <View style={styles.studentIdRow}>
          <Pressable style={[styles.selectField, styles.facultyField]} onPress={() => setSelector("faculty")}>
            <Text style={styles.fieldMiniLabel}>Faculty</Text>
            <Text style={styles.selectValue}>{facultyCode === "all" ? "All" : facultyCode}</Text>
          </Pressable>
          <Pressable style={styles.selectField} onPress={() => setSelector("batch")}>
            <Text style={styles.fieldMiniLabel}>Batch</Text>
            <Text style={styles.selectValue}>{batch === "all" ? "All" : batch}</Text>
          </Pressable>
          <View style={[styles.selectField, styles.numberField]}>
            <Text style={styles.fieldMiniLabel}>Student No</Text>
            <TextInput
              style={styles.inlineInput}
              placeholder="455"
              placeholderTextColor={colors.muted}
              value={studentSerial}
              onChangeText={(value) => setStudentSerial(value.replace(/\D/g, "").slice(0, 3))}
              keyboardType="numeric"
            />
          </View>
        </View>
        <Pressable style={commonStyles.primaryButton} onPress={runSearch}>
          <Text style={commonStyles.primaryButtonText}>Search Tickets</Text>
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Showing</Text>
          <Text style={styles.summaryValue}>{rows.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Issued</Text>
          <Text style={[styles.summaryValue, { color: colors.gold }]}>{counts.issued}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Checked</Text>
          <Text style={[styles.summaryValue, { color: colors.pine }]}>{counts.checkedIn}</Text>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeadText, styles.studentCol]}>Student</Text>
          <Text style={[styles.tableHeadText, styles.ticketCol]}>Ticket</Text>
          <Text style={[styles.tableHeadText, styles.codeCol]}>Code</Text>
          <Text style={[styles.tableHeadText, styles.statusCol]}>Status</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? "Loading ticket database..." : "No tickets match the current filters."}</Text>
        }
        ListFooterComponent={
          rows.length < totalCount ? (
            <Pressable style={styles.loadMoreButton} onPress={loadMore} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.primaryButtonText}>Load More</Text>}
            </Pressable>
          ) : rows.length ? (
            <Text style={styles.endText}>Showing all matching records</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.tableRow} onPress={() => navigation.navigate("TicketDetails", { ticketId: item.id })}>
            <View style={styles.studentCol}>
              <Text style={styles.student} numberOfLines={1}>{formatStudentIdFull(item.student_id_full)}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.faculty_code} · Batch {item.batch}</Text>
            </View>
            <Text style={[styles.cellText, styles.ticketCol]}>#{item.ticket_no}</Text>
            <Text style={[styles.cellText, styles.codeCol]}>{item.verify_code}</Text>
            <View style={styles.statusCol}>
              <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) }]}>
                <Text style={styles.statusPillText}>{item.status === "checked_in" ? "In" : item.status === "cancelled" ? "No" : "New"}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalShade}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <Pressable onPress={clearFilters}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Student</Text>
              <View style={styles.studentIdRow}>
                <Pressable style={[styles.selectField, styles.facultyField]} onPress={() => setSelector("faculty")}>
                  <Text style={styles.fieldMiniLabel}>Faculty</Text>
                  <Text style={styles.selectValue}>{facultyCode === "all" ? "All" : facultyCode}</Text>
                </Pressable>
                <Pressable style={styles.selectField} onPress={() => setSelector("batch")}>
                  <Text style={styles.fieldMiniLabel}>Batch</Text>
                  <Text style={styles.selectValue}>{batch === "all" ? "All" : batch}</Text>
                </Pressable>
                <View style={[styles.selectField, styles.numberField]}>
                  <Text style={styles.fieldMiniLabel}>Student No</Text>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="455"
                    placeholderTextColor={colors.muted}
                    value={studentSerial}
                    onChangeText={(value) => setStudentSerial(value.replace(/\D/g, "").slice(0, 3))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Ticket Number</Text>
              <TextInput style={commonStyles.input} placeholder="1-3500" placeholderTextColor={colors.muted} value={ticketNo} onChangeText={setTicketNo} keyboardType="numeric" />

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.chipRow}>
                {(["all", "issued", "checked_in", "cancelled"] as const).map((item) => {
                  const active = status === item;
                  return (
                    <Pressable key={item} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => setStatus(item)}>
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item.replace("_", " ")}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Photo</Text>
              <View style={styles.chipRow}>
                {(["all", "with", "without"] as const).map((item) => {
                  const active = hasPhoto === item;
                  return (
                    <Pressable key={item} style={[styles.chip, active ? styles.chipActive : null]} onPress={() => setHasPhoto(item)}>
                      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item === "all" ? "All" : item === "with" ? "With photo" : "No photo"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable style={styles.applyButton} onPress={runSearch}>
              <Text style={commonStyles.primaryButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={selector !== null} transparent animationType="slide" onRequestClose={() => setSelector(null)}>
        <View style={styles.modalShade}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelector(null)} />
          <View style={styles.selectorSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selector === "faculty" ? "Select Faculty" : "Select Batch"}</Text>
            <ScrollView contentContainerStyle={styles.optionList}>
              {(selector === "faculty" ? FACULTIES : BATCHES).map((item) => {
                const active = selector === "faculty" ? facultyCode === item.code : batch === item.code;
                return (
                  <Pressable
                    key={item.code}
                    style={[styles.option, active ? styles.optionActive : null]}
                    onPress={() => {
                      if (selector === "faculty") {
                        setFacultyCode(item.code);
                      } else {
                        setBatch(item.code);
                      }
                      setSelector(null);
                    }}
                  >
                    <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{item.label}</Text>
                    <Text style={[styles.optionCode, active ? styles.optionTextActive : null]}>{item.code === "all" ? "All" : item.code}</Text>
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
  filterButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", ...shadow },
  filterIcon: { color: colors.white, fontSize: 24, fontWeight: "900", transform: [{ rotate: "90deg" }] },
  searchPanel: { ...commonStyles.card, gap: 10 },
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
  numberField: { flex: 1.2 },
  fieldMiniLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  selectValue: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 4 },
  inlineInput: { color: colors.ink, fontSize: 16, fontWeight: "900", minHeight: 26, padding: 0, marginTop: 1 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  summaryValue: { color: colors.ink, fontSize: 24, fontWeight: "900", marginTop: 2 },
  tableCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  tableHeader: { minHeight: 38, flexDirection: "row", alignItems: "center", backgroundColor: colors.ink, paddingHorizontal: 10 },
  tableHeadText: { color: colors.white, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  list: { paddingBottom: 170, gap: 2 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 30 },
  tableRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  studentCol: { flex: 1.55, paddingRight: 8 },
  ticketCol: { flex: 0.72, textAlign: "left" },
  codeCol: { flex: 0.7, textAlign: "left" },
  statusCol: { flex: 0.72, alignItems: "flex-start" },
  student: { color: colors.ink, fontWeight: "900", fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  cellText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  statusPill: { minWidth: 38, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center" },
  statusPillText: { color: colors.white, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  error: { color: colors.ember, fontWeight: "800" },
  loadMoreButton: { ...commonStyles.primaryButton, marginTop: 10 },
  endText: { color: colors.muted, textAlign: "center", marginTop: 14, fontSize: 12 },
  modalShade: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(29,42,54,0.38)" },
  sheet: { maxHeight: "88%", backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 10 },
  selectorSheet: { maxHeight: "75%", backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 12 },
  sheetScroll: { gap: 10, paddingBottom: 4 },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: colors.line, alignSelf: "center", marginBottom: 6 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: colors.ink, fontWeight: "900", fontSize: 22 },
  clearText: { color: colors.ember, fontWeight: "900" },
  fieldLabel: { color: colors.ink, fontWeight: "900", marginTop: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontWeight: "800", textTransform: "capitalize" },
  chipTextActive: { color: colors.white },
  applyButton: { ...commonStyles.primaryButton, marginTop: 8 },
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

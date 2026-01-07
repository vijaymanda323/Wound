import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Card, Title, Paragraph, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { fetchWithTimeout } from "../services/apiService";

const API_BASE = "https://woundanalysis.onrender.com";

/* -------------------- HELPERS -------------------- */

const parseResultJson = (resultJson) => {
  try {
    if (!resultJson) return null;

    const parsedOuter =
      typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;

    if (!parsedOuter.final_report) return null;

    const final =
      typeof parsedOuter.final_report === "string"
        ? JSON.parse(parsedOuter.final_report)
        : parsedOuter.final_report;

    return {
      predictions: (final.predictions || []).map((p) => ({
        organism: p.organism || "Unknown",
        confidence: Math.round((p.confidence || 0) * 100),
      })),
      recommendation: final.recommendation || "",
    };
  } catch (e) {
    console.error("Report parse error:", e);
    return null;
  }
};

/* -------------------- SCREEN -------------------- */

export default function ReportsScreen() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedPatientId, setExpandedPatientId] = useState(null);

  useEffect(() => {
    loadRecentCases();
  }, []);

  /* -------- Load Recent Cases -------- */
  const loadRecentCases = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout(
        `${API_BASE}/cases/recent`,
        { method: "GET" },
        60000
      );

      const data = await res.json();
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* -------- Group by Patient -------- */
  const patients = useMemo(() => {
    const map = {};

    cases.forEach((c) => {
      if (!map[c.patient_id]) {
        map[c.patient_id] = {
          patientId: c.patient_id,
          patientName: c.patientName || "Unknown Patient",
          cases: [],
        };
      }

      map[c.patient_id].cases.push({
        id: c.id,
        createdAt: c.created_at,
        status: c.status,
        report: parseResultJson(c.result_json),
      });
    });

    return Object.values(map);
  }, [cases]);

  /* -------- Search Filter -------- */
  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;

    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q)
    );
  }, [search, patients]);

  /* -------------------- UI -------------------- */

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="document-text" size={32} color="#1e40af" />
        <Title style={styles.headerTitle}>Patient Reports</Title>
        <Paragraph style={styles.headerSubtitle}>
          Recent wound analysis by patient
        </Paragraph>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          placeholder="Search by patient name or ID"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* LOADING */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loadingText}>Loading reports…</Text>
        </View>
      ) : (
        filteredPatients.map((patient) => {
          const expanded = expandedPatientId === patient.patientId;

          return (
            <Card key={patient.patientId} style={styles.patientCard}>
              <Card.Content>
                {/* PATIENT HEADER */}
                <TouchableOpacity
                  style={styles.patientHeader}
                  onPress={() =>
                    setExpandedPatientId(
                      expanded ? null : patient.patientId
                    )
                  }
                >
                  <View>
                    <Title style={styles.patientName}>
                      {patient.patientName}
                    </Title>
                    <Text style={styles.patientId}>
                      Patient ID: {patient.patientId}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#1e40af"
                  />
                </TouchableOpacity>

                {/* CASES */}
                {expanded && (
                  <>
                    <Divider style={styles.divider} />

                    {patient.cases.map((c) => (
                      <Card key={c.id} style={styles.caseCard}>
                        <Card.Content>
                          <Text style={styles.caseId}>
                            Case ID: {c.id}
                          </Text>
                          <Text style={styles.caseDate}>
                            {new Date(c.createdAt).toLocaleString()}
                          </Text>

                          {/* RESULTS */}
                          {c.report ? (
                            <>
                              <Divider style={styles.divider} />

                              <Text style={styles.sectionTitle}>
                                Bacteria Detected
                              </Text>

                              {c.report.predictions.map((b, i) => (
                                <View
                                  key={`${c.id}-${i}`}
                                  style={styles.bacteriaRow}
                                >
                                  <Text style={styles.bacteriaName}>
                                    {b.organism}
                                  </Text>
                                  <Text style={styles.confidence}>
                                    {b.confidence}%
                                  </Text>
                                </View>
                              ))}

                              {c.report.recommendation ? (
                                <>
                                  <Divider style={styles.divider} />
                                  <Text style={styles.sectionTitle}>
                                    Clinical Recommendation
                                  </Text>
                                  <Text style={styles.recommendation}>
                                    {c.report.recommendation}
                                  </Text>
                                </>
                              ) : null}
                            </>
                          ) : (
                            <Text style={styles.processingText}>
                              Analysis not completed yet
                            </Text>
                          )}
                        </Card.Content>
                      </Card>
                    ))}
                  </>
                )}
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },

  header: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#1e40af" },
  headerSubtitle: { fontSize: 14, color: "#6b7280" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchInput: { flex: 1, padding: 10 },

  loading: { alignItems: "center", padding: 40 },
  loadingText: { marginTop: 8, color: "#6b7280" },

  patientCard: { marginHorizontal: 16, marginBottom: 16 },
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientName: { fontSize: 18, fontWeight: "600" },
  patientId: { fontSize: 12, color: "#6b7280" },

  divider: { marginVertical: 12 },

  caseCard: {
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  caseId: { fontWeight: "600" },
  caseDate: { fontSize: 12, color: "#6b7280" },

  sectionTitle: { fontWeight: "700", marginBottom: 6 },

  bacteriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bacteriaName: { color: "#dc2626", fontWeight: "600" },
  confidence: { color: "#059669", fontWeight: "600" },

  recommendation: { fontSize: 13, color: "#374151" },
  processingText: { color: "#9ca3af", fontStyle: "italic" },
});

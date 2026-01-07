import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Card, Title, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = "https://woundanalysis.onrender.com";

/* ---------------- HELPERS ---------------- */

const parseFinalReport = (resultJson) => {
  try {
    if (!resultJson) return [];

    const parsed =
      typeof resultJson === "string"
        ? JSON.parse(resultJson)
        : resultJson;

    const final =
      typeof parsed.final_report === "string"
        ? JSON.parse(parsed.final_report)
        : parsed.final_report;

    return (final?.predictions || []).map((p) => ({
      organism: p.organism,
      confidence: Math.round((p.confidence || 0) * 100),
    }));
  } catch {
    return [];
  }
};

const daysBetween = (start) => {
  const created = new Date(start);
  const now = new Date();
  return Math.max(
    1,
    Math.ceil((now - created) / (1000 * 60 * 60 * 24))
  );
};

/* ---------------- SCREEN ---------------- */

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedPatient, setExpandedPatient] = useState(null);

  useEffect(() => {
    loadRecentCases();
  }, []);

  const loadRecentCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cases/recent`);
      const data = await res.json();

      const grouped = {};

      data.forEach((c) => {
        if (!grouped[c.patient_id]) {
          grouped[c.patient_id] = {
            patientId: c.patient_id,
            patientName: c.patientName || "Unknown Patient",
            mrn: c.mrn || "",
            cases: [],
          };
        }

        grouped[c.patient_id].cases.push({
          id: c.id,
          createdAt: c.created_at,
          status: c.status,
          bacteria: parseFinalReport(c.result_json),
        });
      });

      setPatients(Object.values(grouped));
    } catch (e) {
      console.error("Failed to load cases", e);
    } finally {
      setLoading(false);
    }
  };

  /* -------- SEARCH (NAME / ID / MRN) -------- */

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return patients;

    return patients.filter((p) =>
      p.patientName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      (p.mrn && p.mrn.toLowerCase().includes(q))
    );
  }, [patients, search]);

  /* ---------------- UI ---------------- */

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="documents" size={32} color="#1e40af" />
        <Title style={styles.headerTitle}>Patient Reports</Title>
        <Text style={styles.subtitle}>
          Search by Name, Patient ID or MRN
        </Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          placeholder="Search patient name / ID / MRN"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text>Loading recent cases…</Text>
        </View>
      )}

      {/* LIST */}
      {!loading &&
        filteredPatients.map((patient) => {
          const expanded = expandedPatient === patient.patientId;

          return (
            <Card key={patient.patientId} style={styles.patientCard}>
              <Card.Content>
                {/* PATIENT HEADER */}
                <TouchableOpacity
                  onPress={() =>
                    setExpandedPatient(
                      expanded ? null : patient.patientId
                    )
                  }
                  style={styles.patientHeader}
                >
                  <View>
                    <Title style={styles.patientName}>
                      {patient.patientName}
                    </Title>
                    <Text style={styles.meta}>
                      Patient ID: {patient.patientId}
                    </Text>
                    {patient.mrn ? (
                      <Text style={styles.meta}>MRN: {patient.mrn}</Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={24}
                  />
                </TouchableOpacity>

                {/* CASES */}
                {expanded &&
                  patient.cases.map((c) => (
                    <View key={c.id} style={styles.caseCard}>
                      <Divider />

                      <Text style={styles.caseText}>
                        Case ID: {c.id.slice(0, 8)}…
                      </Text>

                      <Text style={styles.caseText}>
                        Wound Duration:{" "}
                        <Text style={styles.bold}>
                          {daysBetween(c.createdAt)} days
                        </Text>
                      </Text>

                      {/* BACTERIA */}
                      {c.bacteria.length === 0 ? (
                        <Text style={styles.noBacteria}>
                          No bacteria detected
                        </Text>
                      ) : (
                        c.bacteria.map((b, i) => (
                          <View key={`${b.organism}-${i}`}>
                            <Text style={styles.bacteria}>
                              🦠 {b.organism}
                            </Text>
                            <View style={styles.bar}>
                              <View
                                style={[
                                  styles.barFill,
                                  { width: `${b.confidence}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.confidence}>
                              Confidence: {b.confidence}%
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  ))}
              </Card.Content>
            </Card>
          );
        })}

      {!loading && filteredPatients.length === 0 && (
        <Text style={styles.empty}>No patients found</Text>
      )}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6fb" },

  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
  },

  loading: {
    alignItems: "center",
    marginTop: 40,
  },

  patientCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },

  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  patientName: {
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    color: "#6b7280",
  },

  caseCard: {
    marginTop: 12,
    paddingTop: 12,
  },
  caseText: {
    fontSize: 13,
    marginTop: 4,
  },
  bold: {
    fontWeight: "700",
  },

  bacteria: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
  },

  bar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginVertical: 4,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 4,
  },

  confidence: {
    fontSize: 12,
    color: "#374151",
  },

  noBacteria: {
    marginTop: 8,
    fontStyle: "italic",
    color: "#6b7280",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#6b7280",
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";

// ---- Notifications config (show while app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STORAGE_KEYS = {
  MEDS: "@meds_v1",
  LOGS: "@logs_v1", // array of {date:'YYYY-MM-DD', medId, time:'HH:mm', takenAtISO}
};

export default function App() {
  const [meds, setMeds] = useState([]);              // [{id, name, times:['08:00'], notifIds:{'08:00': '...'}}]
  const [logs, setLogs] = useState([]);              // dose logs
  const [name, setName] = useState("");
  const [timesInput, setTimesInput] = useState("08:00, 20:00");
  const notifListener = useRef();

  // ---- Load/save
  useEffect(() => {
    (async () => {
      try {
        const m = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.MEDS)) || "[]");
        const l = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.LOGS)) || "[]");
        setMeds(m);
        setLogs(l);
      } catch (e) {
        console.warn("load failed", e);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(meds)).catch(()=>{});
  }, [meds]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs)).catch(()=>{});
  }, [logs]);

  // ---- Ask notif permission & Android channel
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Notifications disabled", "Enable notifications in settings for reminders.");
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    })();
  }, []);

  // Handle tapped notifications (optional)
  useEffect(() => {
    notifListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // You could deep-link to "Today" screen, etc.
    });
    return () => {
      if (notifListener.current) Notifications.removeNotificationSubscription(notifListener.current);
    };
  }, []);

  // ---- Helpers
  const parseTimes = (s) =>
    s
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.length === 4 ? "0" + t : t)); // allow 8:00 -> 08:00

  const scheduleDaily = async (title, hhmm) => {
    const [hour, minute] = hhmm.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
      throw new Error(`Invalid time: ${hhmm}`);
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: `Time for ${title}`, body: "Tap to log your dose.", sound: true },
      trigger: { hour, minute, repeats: true },
    });
    return id;
  };

  const addMedication = async () => {
    const times = parseTimes(timesInput);
    if (!name.trim() || times.length === 0) {
      Alert.alert("Missing info", "Enter a name and at least one time (e.g., 08:00).");
      return;
    }
    try {
      const notifIds = {};
      for (const t of times) {
        notifIds[t] = await scheduleDaily(name.trim(), t);
      }
      const med = {
        id: Date.now().toString(),
        name: name.trim(),
        times,
        notifIds, // map time -> notification id
      };
      setMeds((prev) => [...prev, med]);
      setName("");
      setTimesInput("08:00, 20:00");
      Alert.alert("Scheduled", `Daily reminders set for ${name} at ${times.join(", ")}.`);
    } catch (e) {
      Alert.alert("Schedule failed", e.message);
    }
  };

  const removeMedication = async (medId) => {
    const med = meds.find((m) => m.id === medId);
    if (!med) return;
    // cancel scheduled notifications
    for (const t of med.times) {
      const id = med.notifIds?.[t];
      if (id) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
    }
    setMeds((prev) => prev.filter((m) => m.id !== medId));
  };

  const today = dayjs().format("YYYY-MM-DD");
  const todaysDoses = useMemo(() => {
    // All med+time pairs scheduled today
    return meds.flatMap((m) => m.times.map((t) => ({ medId: m.id, name: m.name, time: t })));
  }, [meds]);

  const isTaken = (medId, time, dateStr) =>
    logs.some((l) => l.medId === medId && l.time === time && l.date === dateStr);

  const markTaken = (medId, time) => {
    if (isTaken(medId, time, today)) return;
    setLogs((prev) => [
      ...prev,
      { date: today, medId, time, takenAtISO: new Date().toISOString() },
    ]);
  };

  // ---- 7-day adherence %
  const { pct, scheduled, taken } = useMemo(() => {
    const days = [...Array(7)].map((_, i) => dayjs().subtract(i, "day").format("YYYY-MM-DD"));
    const scheduledCount = days.reduce((acc, d) => acc + meds.reduce((a, m) => a + m.times.length, 0), 0);
    const takenCount = logs.filter((l) => days.includes(l.date)).length;
    const p = scheduledCount === 0 ? 0 : Math.round((100 * takenCount) / scheduledCount);
    return { pct: p, scheduled: scheduledCount, taken: takenCount };
  }, [meds, logs]);

  // ---- UI
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.h1}>Medication Adherence (MVP)</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>Add Medication</Text>
        <TextInput
          style={styles.input}
          placeholder="Name (e.g., Amoxicillin)"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Times (HH:MM, comma separated)"
          value={timesInput}
          onChangeText={setTimesInput}
        />
        <Button title="Add Medication (schedule daily reminders)" onPress={addMedication} />
        <Text style={styles.hint}>Example: 08:00, 20:00</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Today</Text>
        {todaysDoses.length === 0 ? (
          <Text>No doses scheduled yet.</Text>
        ) : (
          <FlatList
            data={todaysDoses.sort((a,b)=>a.time.localeCompare(b.time))}
            keyExtractor={(item) => item.medId + "_" + item.time}
            renderItem={({ item }) => {
              const takenToday = isTaken(item.medId, item.time, today);
              return (
                <View style={styles.row}>
                  <Text style={{ flex: 1 }}>
                    {item.time} — <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.btn, takenToday ? styles.btnDisabled : styles.btnPrimary]}
                    disabled={takenToday}
                    onPress={() => markTaken(item.medId, item.time)}
                  >
                    <Text style={styles.btnText}>{takenToday ? "Taken" : "Mark taken"}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>This Week</Text>
        <Text>
          Adherence: <Text style={{fontWeight:"700"}}>{pct}%</Text> ({taken}/{scheduled} doses)
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>Manage Medications</Text>
        {meds.length === 0 ? (
          <Text>None yet.</Text>
        ) : (
          meds.map((m) => (
            <View key={m.id} style={styles.row}>
              <Text style={{ flex: 1 }}>
                {m.name} — {m.times.join(", ")}
              </Text>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => removeMedication(m.id)}>
                <Text style={styles.btnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Text style={styles.footer}>
        Privacy-first: local storage & local notifications only. Prototype • Not a medical device.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  card: {
    backgroundColor: "#f7f7f8",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: "#2563eb", borderColor: "#1e40af" },
  btnDanger: { backgroundColor: "#ef4444", borderColor: "#b91c1c" },
  btnDisabled: { backgroundColor: "#a3a3a3", borderColor: "#737373" },
  btnText: { color: "#fff", fontWeight: "700" },
  hint: { color: "#6b7280", marginTop: 6, fontSize: 12 },
  footer: { textAlign: "center", color: "#6b7280", marginTop: 6, fontSize: 12 },
});

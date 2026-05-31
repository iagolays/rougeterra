import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { REGIONS } from "../../data/regions";
import styles from "./Leaderboard.module.css";

const TABS = [
  { id: "bank",    label: "💰 Banco",     field: "bank",              desc: "Máximo oro acumulado en el banco" },
  { id: "vs",      label: "🏆 VS",         field: "vsWins",            desc: "Victorias en Modo VS" },
  { id: "regions", label: "🗺️ Regiones",  field: null,                desc: "Veces completada cada región" },
  { id: "achieve", label: "🎖️ Logros",    field: "achievementsCount", desc: "Logros desbloqueados" },
];

const REGION_IDS = REGIONS.map(r => r.id);

function fmt(n) {
  if (!n) return "0";
  return Number(n).toLocaleString("es-ES");
}

export default function Leaderboard() {
  const { goToHome } = useGameStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState("bank");
  const [rows, setRows] = useState([]);
  const [regionRows, setRegionRows] = useState({});
  const [selectedRegion, setSelectedRegion] = useState(REGION_IDS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const activeTab = TABS.find(t => t.id === tab);

    if (tab === "regions") {
      loadRegionData().then(() => setLoading(false));
    } else {
      loadSimpleTab(activeTab.field).then(() => setLoading(false));
    }
  }, [tab]);

  async function loadSimpleTab(field) {
    try {
      const q = query(
        collection(db, "users"),
        orderBy(`stats.leaderboard.${field}`, "desc"),
        limit(20)
      );
      // Simpler: get all stats docs
      const snap = await getDocs(query(collection(db, "users")));
      const entries = [];
      for (const userDoc of snap.docs) {
        const statsSnap = await getDocs(collection(db, "users", userDoc.id, "stats"));
        const statsDoc = statsSnap.docs.find(d => d.id === "leaderboard");
        if (!statsDoc) continue;
        const data = statsDoc.data();
        const val = data[field] || 0;
        if (val > 0) entries.push({ uid: userDoc.id, displayName: data.displayName || "Anónimo", photoURL: data.photoURL || null, value: val });
      }
      entries.sort((a, b) => b.value - a.value);
      setRows(entries.slice(0, 20));
    } catch (e) {
      console.error(e);
      setRows([]);
    }
  }

  async function loadRegionData() {
    try {
      const snap = await getDocs(collection(db, "users"));
      const byRegion = {};
      for (const r of REGION_IDS) byRegion[r] = [];

      for (const userDoc of snap.docs) {
        const statsSnap = await getDocs(collection(db, "users", userDoc.id, "stats"));
        const statsDoc = statsSnap.docs.find(d => d.id === "leaderboard");
        if (!statsDoc) continue;
        const data = statsDoc.data();
        const regions = data.regionsCompleted || {};
        for (const [rid, count] of Object.entries(regions)) {
          if (byRegion[rid] && count > 0) {
            byRegion[rid].push({ uid: userDoc.id, displayName: data.displayName || "Anónimo", photoURL: data.photoURL || null, value: count });
          }
        }
      }
      for (const r of REGION_IDS) byRegion[r].sort((a, b) => b.value - a.value);
      setRegionRows(byRegion);
    } catch (e) {
      console.error(e);
    }
  }

  const activeTab = TABS.find(t => t.id === tab);
  const displayRows = tab === "regions" ? (regionRows[selectedRegion] || []) : rows;

  return (
    <div className={styles.screen}>
      <div className={styles.bg} /><div className={styles.bgOverlay} />

      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={goToHome}>← Volver</button>
          <h2 className={styles.title}>Leaderboard</h2>
          <p className={styles.subtitle}>Rankings globales de todos los jugadores</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Region selector */}
        {tab === "regions" && (
          <div className={styles.regionSelect}>
            {REGIONS.map(r => (
              <button
                key={r.id}
                className={`${styles.regionBtn} ${selectedRegion === r.id ? styles.regionActive : ""}`}
                onClick={() => setSelectedRegion(r.id)}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        )}

        <p className={styles.tabDesc}>{activeTab?.desc}</p>

        {/* Ranking list */}
        <div className={styles.list}>
          {loading && <div className={styles.loadingMsg}>Cargando...</div>}
          {!loading && displayRows.length === 0 && (
            <div className={styles.emptyMsg}>Nadie en este ranking todavía. ¡Sé el primero!</div>
          )}
          {!loading && displayRows.map((row, i) => (
            <div key={row.uid} className={`${styles.row} ${row.uid === user?.uid ? styles.rowMe : ""}`}>
              <div className={styles.rank}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </div>
              {row.photoURL
                ? <img src={row.photoURL} className={styles.avatar} referrerPolicy="no-referrer" />
                : <div className={styles.avatarFallback}>👤</div>}
              <div className={styles.name}>
                {row.displayName}
                {row.uid === user?.uid && <span className={styles.youBadge}> (Tú)</span>}
              </div>
              <div className={styles.value}>
                {tab === "bank" && `${fmt(row.value)}g`}
                {tab === "vs" && `${row.value} victoria${row.value !== 1 ? "s" : ""}`}
                {tab === "regions" && `${row.value}×`}
                {tab === "achieve" && `${row.value} logro${row.value !== 1 ? "s" : ""}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

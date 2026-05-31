import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { REGIONS } from "../../data/regions";
import styles from "./Leaderboard.module.css";

const TABS = [
  { id: "bank",    label: "💰 Banco",    field: "bank",              desc: "Máximo oro acumulado en el banco" },
  { id: "vs",      label: "🏆 VS",        field: "vsWins",            desc: "Victorias en Modo VS" },
  { id: "regions", label: "🗺️ Regiones", field: null,                desc: "Veces completada cada región" },
  { id: "achieve", label: "🎖️ Logros",   field: "achievementsCount", desc: "Logros desbloqueados" },
];

function fmt(n) {
  return n ? Number(n).toLocaleString("es-ES") : "0";
}

export default function Leaderboard() {
  const { goToHome } = useGameStore();
  const { user } = useAuthStore();

  const [tab, setTab] = useState("bank");
  const [rows, setRows] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab, selectedRegion]);

  async function loadData() {
    setLoading(true);
    setRows([]);
    try {
      const activeTab = TABS.find(t => t.id === tab);

      if (tab === "regions") {
        // Order by the specific region count
        const field = `regionsCompleted.${selectedRegion}`;
        const snap = await getDocs(collection(db, "leaderboard"));
        const entries = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(d => (d.regionsCompleted?.[selectedRegion] || 0) > 0)
          .sort((a, b) => (b.regionsCompleted?.[selectedRegion] || 0) - (a.regionsCompleted?.[selectedRegion] || 0))
          .slice(0, 20)
          .map(d => ({ uid: d.uid, displayName: d.displayName || "Anónimo", photoURL: d.photoURL || null, value: d.regionsCompleted?.[selectedRegion] || 0 }));
        setRows(entries);
      } else {
        const field = activeTab.field;
        const q = query(collection(db, "leaderboard"), orderBy(field, "desc"), limit(20));
        const snap = await getDocs(q);
        const entries = snap.docs
          .map(d => ({ uid: d.id, displayName: d.data().displayName || "Anónimo", photoURL: d.data().photoURL || null, value: d.data()[field] || 0 }))
          .filter(e => e.value > 0);
        setRows(entries);
      }
    } catch (e) {
      console.error("Leaderboard error:", e);
    } finally {
      setLoading(false);
    }
  }

  const activeTab = TABS.find(t => t.id === tab);

  return (
    <div className={styles.screen}>
      <div className={styles.bg} /><div className={styles.bgOverlay} />

      <div className={styles.content}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={goToHome}>← Volver</button>
          <h2 className={styles.title}>Leaderboard</h2>
          <p className={styles.subtitle}>Rankings globales de todos los jugadores</p>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "regions" && (
          <div className={styles.regionSelect}>
            {REGIONS.map(r => (
              <button key={r.id} className={`${styles.regionBtn} ${selectedRegion === r.id ? styles.regionActive : ""}`} onClick={() => setSelectedRegion(r.id)}>
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        )}

        <p className={styles.tabDesc}>{activeTab?.desc}</p>

        <div className={styles.list}>
          {loading && <div className={styles.loadingMsg}>⟳ Cargando...</div>}
          {!loading && rows.length === 0 && (
            <div className={styles.emptyMsg}>Nadie en este ranking todavía. ¡Sé el primero!</div>
          )}
          {!loading && rows.map((row, i) => (
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

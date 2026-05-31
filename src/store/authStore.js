import { create } from "zustand";
import { auth, googleProvider, db } from "../firebase";
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, getFirestore } from "firebase/firestore";
import { useGameStore } from "./gameStore";

// Exact same fields as gameStore's partialize
const SAVE_FIELDS = [
  "player", "gold", "bank", "regionIdx", "combatIndex",
  "shopItems", "rewardItems", "acquiredLegendaryIds",
  "totalKills", "totalCombats", "totalDamage", "winStreak",
  "sideDest", "sideDestUsed", "bankUsesLeft",
  "tutorialStep", "tutorialDone",
  "unlockedAchievements", "collectedItemIds",
  "runRested", "runGoldEarned", "runInfoOpens", "runManaPotionsUsed",
];

function pickSaveFields(state) {
  const out = {};
  for (const k of SAVE_FIELDS) if (k in state) out[k] = state[k];
  return out;
}

const SAVE_DOC = (uid) => doc(db, "users", uid, "saves", "current");

let debounceTimer = null;
let storeUnsub = null;

export const useAuthStore = create((set, get) => ({
  user: null,
  authLoading: true,
  cloudSaveLoaded: false,
  signInError: null,

  init: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user, authLoading: false });
      if (!user) {
        if (storeUnsub) { storeUnsub(); storeUnsub = null; }
        clearTimeout(debounceTimer);
      }
    });
  },

  signIn: async () => {
    set({ signInError: null });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        set({ signInError: "No se pudo iniciar sesión. Inténtalo de nuevo." });
      }
    }
  },

  signOut: async () => {
    if (storeUnsub) { storeUnsub(); storeUnsub = null; }
    clearTimeout(debounceTimer);
    await firebaseSignOut(auth);
    set({ user: null, cloudSaveLoaded: false, signInError: null });
    // Game state stays intact — they can keep playing locally
  },

  loadFromFirestore: async (uid) => {
    try {
      const snap = await getDoc(SAVE_DOC(uid));
      if (snap.exists()) {
        useGameStore.getState()._setState(snap.data());
      }
    } catch (e) {
      console.error("Error cargando partida:", e);
    } finally {
      set({ cloudSaveLoaded: true });
      get()._setupAutoSave(uid);
    }
  },

  // Update a leaderboard stat for the current user
  // type: "bank" (set if higher), "region" (increment regionId count),
  //       "achievements" (set exact count), "vsWins" (increment)
  updateLeaderboardStats: async (type, value) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    const ref = doc(db, "users", user.uid, "stats", "leaderboard");
    try {
      // Always keep display info up to date
      const baseFields = { displayName: user.displayName || "Anónimo", photoURL: user.photoURL || null };
      if (type === "bank") {
        const snap = await getDoc(ref);
        const current = snap.exists() ? (snap.data().bank || 0) : 0;
        if (value > current) await setDoc(ref, { ...baseFields, bank: value }, { merge: true });
      } else if (type === "region") {
        await setDoc(ref, { ...baseFields, [`regionsCompleted.${value}`]: increment(1) }, { merge: true });
      } else if (type === "achievements") {
        await setDoc(ref, { ...baseFields, achievementsCount: value }, { merge: true });
      } else if (type === "vsWins") {
        await setDoc(ref, { ...baseFields, vsWins: increment(1) }, { merge: true });
      }
    } catch (e) {
      console.error("Error actualizando leaderboard:", e);
    }
  },

  _setupAutoSave: (uid) => {
    if (storeUnsub) storeUnsub();
    storeUnsub = useGameStore.subscribe((state) => {
      if (!state.dataLoaded) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          await setDoc(SAVE_DOC(uid), pickSaveFields(state));
        } catch (e) {
          console.error("Error guardando partida:", e);
        }
      }, 2000);
    });
  },
}));

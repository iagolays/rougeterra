import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./PatchNotes.module.css";

const PATCHES = [
  {
    version: "v0.1 — Open Beta",
    date: "May 2026",
    sections: [
      {
        title: "Champions",
        items: [
          "3 playable champions: Darius, Ashe and Akali.",
          "Darius — Hemorrhage mark system: Q, W and E each apply a mark (max 3, lasts 3 turns). Noxian Guillotine deals +40% bonus damage per active mark (up to +120%).",
          "Akali — Shuriken Flip lodges a shuriken that auto-detonates after 2 turns for ¼ extra damage. Perfect Execution Part 2 fires automatically 1 turn later, scaling up to ×2.5 based on enemy missing HP.",
          "Akali — Twilight Shroud now also recovers ⅓ of max energy on cast.",
          "Ashe — Volley now hits all enemies simultaneously.",
          "Ashe — Enchanted Crystal Arrow stuns for 3 turns (up from 2).",
        ],
      },
      {
        title: "Combat",
        items: [
          "Multi-enemy encounters: elite fights can spawn 2 enemies.",
          "Splash abilities (Darius Q, Akali Q) deal ⅓ damage to a second enemy.",
          "AoE abilities (Ashe W) deal full damage to all enemies.",
          "Ability unlock progression: Q is available from the start, W / E / R unlock after consecutive victories.",
          "5 item synergies: Rabadon's Deathcap, Infinity Edge, Liandry's Anguish, Black Cleaver, Warmog's Armor.",
          "Delayed ability effects (Akali E, Akali R Part 2) trigger automatically at the start of the enemy's turn.",
        ],
      },
      {
        title: "Map & Progression",
        items: [
          "6 regions in order: Demacia → Noxus → Freljord → Piltover → Shadow Isles → The Void.",
          "Interactive Runeterra SVG map with colored region overlays.",
          "On mobile, the map auto-zooms to center the current region.",
          "Next region preview shown with a faint border on the map.",
          "Combat progress indicator showing remaining fights in the current region.",
        ],
      },
      {
        title: "Economy & Shop",
        items: [
          "Bank of Runeterra: deposit gold to keep it safe across runs.",
          "Bank balance persists between runs — even after death.",
          "Sell items in the shop at half their gold value.",
          "Resource potions available in the shop: Mana Potion (35g) and Energy Potion (35g), colored for each champion.",
          "Reward screen: when inventory is full, pick an item to discard and replace.",
        ],
      },
      {
        title: "Known Issues",
        items: [
          "The Void region pins appear at the very bottom edge of the map on small screens.",
          "Some item tooltips may be cut off on narrow mobile viewports.",
          "Shadow Isles region outline is small — will be adjusted in a future patch.",
        ],
      },
    ],
  },
];

export default function PatchNotes() {
  const { goToHome } = useGameStore();

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goToHome}>← Back</button>
        <div className={styles.headerTitle}>Patch Notes</div>
      </div>

      <div className={styles.content}>
        {PATCHES.map(patch => (
          <div key={patch.version} className={styles.patch}>
            <div className={styles.patchHeader}>
              <span className={styles.patchVersion}>{patch.version}</span>
              <span className={styles.patchDate}>{patch.date}</span>
            </div>
            {patch.sections.map(section => (
              <div key={section.title} className={styles.section}>
                <div className={styles.sectionTitle}>{section.title}</div>
                <ul className={styles.list}>
                  {section.items.map((item, i) => (
                    <li key={i} className={styles.listItem}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Credits.module.css";

const SECTIONS = [
  {
    title: "Aviso legal",
    items: [
      { text: "RogueTerra es un proyecto de fans no oficial y sin ánimo de lucro. No está afiliado, patrocinado ni respaldado por Riot Games." },
      { text: "Todos los nombres de campeones, habilidades, objetos, regiones y el lore pertenecen a Riot Games / League of Legends." },
      { text: "Se acoge a la política «Legal Jibber Jabber» de Riot Games para contenido de fans." },
    ],
  },
  {
    title: "Imágenes de campeones, objetos y habilidades",
    items: [
      {
        text: "Splash arts, iconos de campeones, iconos de objetos e iconos de habilidades obtenidos de Data Dragon, la API pública de recursos de Riot Games.",
        url: "https://developer.riotgames.com/docs/lol#data-dragon",
        label: "Data Dragon (Riot Games)",
      },
    ],
  },
  {
    title: "Mapa de Runeterra",
    items: [
      {
        text: "El mapa de fondo de alta resolución de Runeterra fue compartido por la comunidad en r/loreofruneterra.",
        url: "https://www.reddit.com/r/loreofruneterra/comments/1772h2v/resource_a_very_high_resolution_runeterra_map/",
        label: "Mapa en alta resolución — r/loreofruneterra",
      },
    ],
  },
  {
    title: "Sonidos",
    items: [
      {
        text: "Efectos de sonido de subida de nivel y de reaparición extraídos del archivo de sonidos de League of Legends recopilado por Spectral Coding.",
        url: "https://wiki.spectralcoding.com/info:league_of_legends_sounds:league_of_legends_sounds",
        label: "Spectral Coding — League of Legends Sounds",
      },
      { text: "Sonido de logro de estilo Steam." },
    ],
  },
  {
    title: "Otros recursos",
    items: [
      { text: "Iconos de interfaz (moneda, ping) procedentes de CommunityDragon.", url: "https://www.communitydragon.org/", label: "CommunityDragon" },
      { text: "Imágenes del banner de derrota y de Poppy: arte de League of Legends propiedad de Riot Games." },
      { text: "Tipografías «Cinzel» y «Crimson Pro» vía Google Fonts.", url: "https://fonts.google.com/", label: "Google Fonts" },
    ],
  },
  {
    title: "Desarrollo",
    items: [
      { text: "Juego desarrollado con React, Vite y Zustand.", url: "https://github.com/iagolays/rogueterra", label: "Código fuente en GitHub" },
    ],
  },
];

export default function Credits() {
  const goToHome = useGameStore(s => s.goToHome);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goToHome}>← Volver</button>
        <div className={styles.headerTitle}>Referencias y créditos</div>
      </div>

      <div className={styles.content}>
        <p className={styles.intro}>
          RogueTerra usa recursos de League of Legends y de la comunidad. Aquí tienes de dónde vienen.
        </p>

        {SECTIONS.map(section => (
          <div key={section.title} className={styles.section}>
            <div className={styles.sectionTitle}>{section.title}</div>
            <ul className={styles.list}>
              {section.items.map((item, i) => (
                <li key={i} className={styles.listItem}>
                  {item.text}
                  {item.url && (
                    <>
                      {" "}
                      <a className={styles.link} href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.label || item.url} ↗
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className={styles.thanks}>Gracias a Riot Games y a la comunidad de Runeterra. ❤️</p>
      </div>
    </div>
  );
}

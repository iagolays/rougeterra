import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./PatchNotes.module.css";

const PATCHES = [
  {
    version: "v0.6 — Objetos mejorados",
    date: "May 2026",
    sections: [
      {
        title: "Esquiva y velocidad de movimiento",
        items: [
          "CORREGIDO: el tooltip de las botas mostraba el % de esquiva por objeto individual sin avisar del cap global — ahora muestra la contribución exacta de cada objeto y aclara el límite total.",
          "El cap de esquiva por velocidad de movimiento sube de 25% a 50%, haciendo que apilar botas sea realmente útil.",
        ],
      },
      {
        title: "Sorcerer's Shoes",
        items: [
          "Ahora otorgan también +15 de Poder de Habilidad, además de los +45 de velocidad de movimiento y la penetración mágica.",
        ],
      },
      {
        title: "Objetos de vida",
        items: [
          "Al equipar un objeto que otorgue HP máximo, tu vida actual aumenta en la misma cantidad. Ejemplo: 200/300 HP + objeto de +500 HP → 700/800 HP.",
          "Este comportamiento se aplica tanto al comprar en tienda como al coger recompensas de combate.",
        ],
      },
    ],
  },
  {
    version: "v0.5 — Logros",
    date: "May 2026",
    sections: [
      {
        title: "Sistema de logros",
        items: [
          "19 logros desbloqueables, accesibles desde el botón «Logros» del menú principal.",
          "Aviso animado en pantalla cada vez que desbloqueas un logro.",
          "Los logros ocultos aparecen como «???» hasta que los descubres.",
          "Los logros y los objetos coleccionados se guardan entre partidas.",
        ],
      },
      {
        title: "Otros",
        items: [
          "Nueva pantalla «Referencias» con los créditos y el origen de todos los recursos (mapa, imágenes, tipografías).",
          "El botón de Logros del menú principal es ahora más visible.",
        ],
      },
      {
        title: "Correcciones",
        items: [
          "CORREGIDO: si un enemigo moría por sangrado, daño diferido (Akali) o un contraataque, el combate se quedaba bloqueado y había que recargar. Ahora la victoria se detecta correctamente sin importar qué dé el golpe final.",
          "Al volver al turno del jugador, el objetivo se reasigna automáticamente a un enemigo vivo.",
        ],
      },
    ],
  },
  {
    version: "v0.4 — Objetos, Estados y Economía",
    date: "May 2026",
    sections: [
      {
        title: "Objetos: las estadísticas ahora funcionan de verdad",
        items: [
          "Robo de vida: te curas por el % indicado del daño físico que infliges (antes no hacía nada).",
          "Velocidad de ataque: aumenta el daño de tus habilidades físicas.",
          "Velocidad de movimiento: otorga probabilidad de esquivar ataques enemigos.",
          "Maná/Recurso: los objetos de maná ahora aumentan tu reserva máxima.",
          "Regeneración: recuperas HP al final de cada turno.",
          "Las tarjetas de la tienda y de recompensa muestran las estadísticas y las pasivas/activas de cada objeto.",
        ],
      },
      {
        title: "Panel de información",
        items: [
          "Nueva pestaña «Estados» que explica qué hace cada efecto (aturdido, sangrado, expuesto, escudo, etc.).",
          "El panel de info (ℹ) ahora también está disponible en la tienda y en la pantalla de recompensa.",
          "El tutorial incluye un paso dedicado a los efectos de estado.",
        ],
      },
      {
        title: "Economía y correcciones",
        items: [
          "CORREGIDO: el destino lateral (Descansar/Evento) cambiaba al entrar y salir de la tienda. Ahora solo cambia tras cada combate.",
          "El destino lateral solo puede usarse una vez por combate.",
          "Límite de pociones: máximo 3 de vida y 5 de maná/energía, con indicador en la tienda.",
          "El banco está limitado a 2 transacciones por partida, con indicador de las restantes.",
        ],
      },
    ],
  },
  {
    version: "v0.3 — Tutorial & Guardado",
    date: "May 2026",
    sections: [
      {
        title: "Novedades",
        items: [
          "Tutorial interactivo: al empezar tu primera partida, una guía paso a paso resalta cada parte de la interfaz (estado, inventario, mapa, combate) con su explicación.",
          "Botón 'Ver Tutorial' en el menú principal para repetir la guía cuando quieras.",
          "Guardado automático: tu progreso se guarda en el navegador. Si recargas la página puedes pulsar 'Continuar Partida' desde el menú principal.",
          "El menú principal muestra una tarjeta con tu campeón actual, región, HP y oro cuando hay una partida en curso.",
          "Botón 'Nueva Partida' con confirmación para no perder el progreso por accidente (el oro del banco siempre se conserva).",
        ],
      },
      {
        title: "Correcciones",
        items: [
          "El tutorial ya no se solapa con el panel de selección de habilidad al empezar la partida — espera a que elijas.",
          "Las tarjetas del tutorial que explican elementos de la parte inferior (destinos, habilidades de combate) ahora aparecen en la parte superior para no taparlos.",
          "En 'Continuar Partida' se muestra la foto del campeón en lugar de un emoji.",
        ],
      },
    ],
  },
  {
    version: "v0.2 — Hotfix & Polish",
    date: "May 2026",
    sections: [
      {
        title: "Corrección de bugs",
        items: [
          "CORREGIDO — La tienda se regeneraba cada vez que la visitabas. Ahora el stock solo cambia tras completar un combate.",
          "CORREGIDO — Podías comprar objetos de equipo aunque el inventario estuviese lleno. Ahora los objetos quedan bloqueados visualmente y aparece un aviso.",
          "CORREGIDO — Los objetos comprados en la tienda no desaparecían del stock. El equipo se agota al comprarlo; los consumibles (pociones) no.",
          "CORREGIDO — Los tooltips de las habilidades Q y del botón Pass se salían de la pantalla en móvil. Ahora se anclan al borde izquierdo o derecho según su posición.",
          "CORREGIDO — El dinero del banco se reseteaba a 0 al empezar una nueva partida. Ahora persiste entre partidas correctamente.",
          "CORREGIDO — Las habilidades con daño en área (Volley de Ashe, Decimate de Darius Q) no aplicaban el daño a los enemigos secundarios. Solucionado.",
        ],
      },
      {
        title: "Nuevas funcionalidades",
        items: [
          "Objetos legendarios únicos por partida: los objetos con valor ≥2500g no pueden volver a aparecer en tienda ni como recompensa una vez obtenidos.",
          "Indicador visual de Hemorragia (Darius): el badge '🩸 Hemorragia ×N' aparece sobre el enemigo objetivo mostrando las marcas activas y los turnos restantes.",
          "Botón ℹ en el inventario del mapa: abre un panel con dos pestañas — Habilidades (descripción, coste y CD de cada skill) y Objetos (stats completos de lo que llevas equipado).",
          "Las estadísticas de los objetos ahora se ven directamente en las tarjetas de la tienda, con código de color por tipo (rojo=HP, dorado=AD, azul=AP, morado=MR…).",
          "Pantalla de inicio con el nombre del juego, botón Jugar y botón Notas de Parche.",
          "Soporte PWA completo: se puede instalar como app desde el navegador en móvil y escritorio.",
        ],
      },
      {
        title: "Equilibrio y descripciones",
        items: [
          "Darius W (Crippling Strike): descripción actualizada para indicar claramente que aplica marca de Hemorragia.",
          "Todas las descripciones de habilidades de Darius, Ashe y Akali muestran ahora los multiplicadores de daño exactos (+1.6× AD, etc.) en lugar de texto genérico.",
          "Ashe R: el stun dura 3 turnos (antes 2).",
          "Akali W: recupera ⅓ de energía máxima al lanzarse, además de otorgar evasión.",
        ],
      },
    ],
  },
  {
    version: "v0.1 — Open Beta",
    date: "May 2026",
    sections: [
      {
        title: "Campeones",
        items: [
          "3 campeones jugables: Darius, Ashe y Akali.",
          "Darius — Sistema de marcas Hemorragia: Q, W y E aplican una marca (máx 3, duran 3 turnos). Guillotina Noxiana hace +40% de daño por marca activa (hasta +120%).",
          "Akali — Lanzamiento de shuriken deja un shuriken incrustado que detona automáticamente tras 2 turnos causando ¼ del daño. Ejecución perfecta Parte 2 se activa sola 1 turno después, escalando hasta ×2.5 con la vida que falta al enemigo.",
          "Akali — Velo del crepúsculo recupera ⅓ de energía máxima al lanzarse.",
          "Ashe — Volley impacta a todos los enemigos simultáneamente.",
          "Ashe — Flecha de cristal encantada aturde 3 turnos.",
        ],
      },
      {
        title: "Combate",
        items: [
          "Encuentros multi-enemigo: los combates de élite pueden tener 2 enemigos.",
          "Habilidades de splash (Darius Q, Akali Q) hacen ⅓ del daño a un segundo enemigo.",
          "Habilidades de área (Ashe W) hacen daño completo a todos los enemigos.",
          "Desbloqueo progresivo de habilidades: Q disponible desde el inicio, W/E/R se desbloquean tras victorias.",
          "5 sinergias de objetos: Sombrero de Rabadon, Filo Infinito, Tormento de Liandry, Segadora Negra, Armadura de Warmog.",
          "Efectos diferidos (Akali E, Akali R Parte 2) se activan automáticamente al inicio del turno enemigo.",
        ],
      },
      {
        title: "Mapa y progresión",
        items: [
          "6 regiones: Demacia → Noxus → Freljord → Piltover → Shadow Isles → The Void.",
          "Mapa SVG interactivo de Runeterra con overlays de regiones.",
          "En móvil el mapa hace zoom automático a la región actual.",
          "Vista previa de la siguiente región con borde suave.",
          "Indicador de combates restantes en la región actual.",
        ],
      },
      {
        title: "Economía y tienda",
        items: [
          "Banco de Runeterra: guarda oro entre partidas, seguro incluso si mueres.",
          "Vender objetos en la tienda a la mitad de su valor.",
          "Pociones de maná/energía disponibles en tienda (35g), con filtro de color distinto por recurso.",
          "Pantalla de recompensa: si el inventario está lleno, puedes intercambiar un objeto existente.",
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

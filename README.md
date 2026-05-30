# RogueTerra

> Roguelike por turnos ambientado en Runeterra — fan game de League of Legends

🎮 **[Jugar ahora → rougeterra.vercel.app](https://rougeterra.vercel.app)**

---

## ¿Qué es RogueTerra?

RogueTerra es un roguelike por turnos inspirado en el universo de League of Legends. Elige un campeón, recorre 6 regiones de Runeterra, derrota enemigos, consigue objetos y enfréntate al poder del Vacío.

Cada partida es única: los enemigos escalan con la dificultad, la tienda cambia tras cada combate, y las habilidades se desbloquean progresivamente según avanzas.

---

## Capturas de pantalla

| Pantalla de inicio | Selección de campeón | Combate | Mapa |
|---|---|---|---|
| *(próximamente)* | *(próximamente)* | *(próximamente)* | *(próximamente)* |

---

## Campeones disponibles

| Campeón | Recurso | Estilo | Mecánica única |
|---|---|---|---|
| **Darius** | Ninguno | Bruiser cuerpo a cuerpo | Sistema de marcas Hemorragia: Q/W/E apilan marcas (máx 3). La R consume todas y añade +40% de daño por marca |
| **Ashe** | Maná | Tiradora a distancia | Q golpea a todos los enemigos; R aturde 3 turnos |
| **Akali** | Energía | Asesina mixta | E ¼ del daño tras 2 turnos; R tiene 2 partes — la Parte 2 escala con la vida que le falta al enemigo |

---

## Regiones

El juego transcurre en 6 regiones de Runeterra en orden creciente de dificultad:

1. 🛡️ **Demacia** — Llanuras doradas, guardianes y caballeros
2. 🗡️ **Noxus** — El Imperio implacable
3. ❄️ **Freljord** — El norte helado y sus criaturas
4. ⚙️ **Piltover** — La Ciudad del Progreso y sus golems Hextech
5. 💀 **Shadow Isles** — Las islas malditas donde los muertos no descansan
6. 🌌 **The Void** — Una dimensión de pura destrucción

Cada región tiene entre 4 y 5 combates, enemigos propios y un jefe final.

---

## Mecánicas principales

### Combate
- Sistema de turnos: tú actúas primero, luego el enemigo
- 4 habilidades (Q / W / E / R) que se desbloquean progresivamente
- Efectos de estado: aturdimiento, ralentización, silencio, sangrado, esquiva, escudo, etc.
- La R requiere cargas de ultimate que se acumulan ganando combates
- Algunas habilidades tienen efectos diferidos que se activan automáticamente turnos después

### Progresión
- Sistema de objetos con más de 100 items de DDragon
- 5 sinergias de objetos: Sombrero de Rabadon, Filo Infinito, Tormento de Liandry, Segadora Negra, Armadura de Warmog
- Recompensas de objetos entre combates — si el inventario está lleno, puedes intercambiar
- Tienda con equipamiento, consumibles y pociones de recurso
- Banco de Runeterra: guarda oro entre partidas (persiste aunque mueras)

### Mapa interactivo
- Mapa SVG de Runeterra con regiones resaltadas
- En móvil hace zoom automático a la región actual
- Indicador de progreso de combates restantes en la región

---

## Instalación local

### Requisitos
- Node.js 18+
- Python 3.8+ (solo para descargar assets)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/iagolays/rougeterra.git
cd rougeterra

# 2. Instalar dependencias
npm install

# 3. Descargar assets de Data Dragon (imágenes de campeones, items, habilidades)
npm run fetch-data

# 4. Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

### Build de producción

```bash
npm run build
npm run preview
```

---

## Stack tecnológico

| Tecnología | Uso |
|---|---|
| React 18 | UI y componentes |
| Zustand | Estado global |
| Vite | Bundler y dev server |
| CSS Modules | Estilos por componente |
| SVG | Mapa interactivo de Runeterra |
| Riot Data Dragon API | Datos e imágenes de campeones e items |
| Vercel | Despliegue |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── Home/          # Pantalla de inicio
│   ├── ChampionSelect/# Selección de campeón
│   ├── Map/           # Mapa de Runeterra + RuneterraMap SVG
│   ├── Combat/        # Sistema de combate
│   ├── Shop/          # Tienda
│   ├── Reward/        # Pantalla de recompensa
│   ├── PatchNotes/    # Notas de parche
│   ├── Event/         # Eventos aleatorios
│   ├── Victory/       # Pantalla de victoria
│   ├── GameOver/      # Pantalla de derrota
│   └── UI/            # Componentes reutilizables
├── data/
│   ├── champions.json # Datos de campeones (generado por fetch_data.py)
│   ├── items.json     # Datos de items (generado por fetch_data.py)
│   ├── championsConfig.js # Config de gameplay de cada campeón
│   └── regions.js     # Regiones, enemigos y escalado de dificultad
├── game/
│   └── combat.js      # Motor de combate puro (funciones sin efectos secundarios)
└── store/
    └── gameStore.js   # Estado global con Zustand
scripts/
└── fetch_data.py      # Descarga assets de Riot Data Dragon
public/
└── assets/            # Imágenes de campeones, items, habilidades y mapa
```

---

## Notas de parche

Consulta las notas de parche completas dentro del juego en **Pantalla de inicio → Patch Notes**.

### v0.1 — Open Beta (Mayo 2026)
- 3 campeones jugables: Darius, Ashe, Akali
- 6 regiones con enemigos propios y jefes finales
- Sistema de marcas Hemorragia de Darius
- Habilidades diferidas de Akali (E y R)
- Volley de Ashe con daño a todos los enemigos
- Mapa SVG interactivo con zoom en móvil
- Sistema de banco persistente entre partidas
- Venta de objetos en la tienda
- Pociones de maná/energía

---

## Aviso legal y política de uso

**RogueTerra es un proyecto de fans no oficial y sin ánimo de lucro.**

- Este proyecto **no está afiliado, patrocinado ni respaldado** por Riot Games.
- **No se obtiene ningún beneficio económico** de este proyecto. Es completamente gratuito.
- Todos los nombres de campeones, habilidades, items, regiones, imágenes y lore pertenecen a **Riot Games / League of Legends**.
- Las imágenes de campeones, items y habilidades se obtienen de la **API pública de Data Dragon de Riot Games**.
- Este proyecto se acoge a la política *"Legal Jibber Jabber"* de Riot Games para proyectos de fans.
- Si Riot Games solicita la retirada del proyecto, se procederá de inmediato.

> *RogueTerra isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.*

---

## Contribuir

¿Tienes ideas o encuentras bugs? Abre un [issue](https://github.com/iagolays/rougeterra/issues) o un pull request. El proyecto está en Beta activa y hay mucho por añadir:

- [ ] Más campeones (Garen, Jinx, Yasuo...)
- [ ] Más objetos y sinergias
- [ ] Eventos aleatorios expandidos
- [ ] Sistema de logros
- [ ] Tabla de puntuaciones
- [ ] Modo oscuro / temas visuales

---

## Licencia

El código fuente de este proyecto está bajo licencia **MIT**.
Los assets (imágenes, datos) pertenecen a Riot Games y se usan bajo su política de contenido de fans.

---

<div align="center">
  Un intento de roguelike
  <br/>
  <a href="https://rougeterra.vercel.app">🎮 Jugar</a> ·
  <a href="https://github.com/iagolays/rougeterra/issues">🐛 Reportar bug</a> ·
  <a href="https://github.com/iagolays/rougeterra/issues">💡 Sugerir idea</a>
</div>

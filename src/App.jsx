import React, { useEffect } from "react";
import { useGameStore } from "./store/gameStore";
import { LoadingScreen } from "./components/UI";
import Home           from "./components/Home";
import PatchNotes     from "./components/PatchNotes";
import ChampionSelect from "./components/ChampionSelect";
import Map            from "./components/Map";
import Combat         from "./components/Combat";
import Shop           from "./components/Shop";
import Reward         from "./components/Reward";
import Event          from "./components/Event";
import GameOver       from "./components/GameOver";
import Victory        from "./components/Victory";

export default function App() {
  const { screen, dataLoaded, dataError, loadData } = useGameStore();

  useEffect(() => { loadData(); }, []);

  if (!dataLoaded) return <LoadingScreen />;

  switch (screen) {
    case "home":        return <Home />;
    case "patchnotes":  return <PatchNotes />;
    case "select":      return <ChampionSelect />;
    case "map":         return <Map />;
    case "combat":      return <Combat />;
    case "shop":        return <Shop />;
    case "reward":      return <Reward />;
    case "event":       return <Event />;
    case "gameover":    return <GameOver />;
    case "victory":     return <Victory />;
    default:            return <LoadingScreen error={dataError} />;
  }
}

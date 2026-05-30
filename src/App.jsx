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
import TutorialCard   from "./components/Tutorial/TutorialCard";
import Jumpscare      from "./components/Jumpscare";
import Achievements   from "./components/Achievements";
import AchievementToast from "./components/Achievements/AchievementToast";
import Credits        from "./components/Credits";
import SorakaBlessing from "./components/SorakaBlessing";

export default function App() {
  const { screen, dataLoaded, dataError, loadData } = useGameStore();

  useEffect(() => { loadData(); }, []);

  if (!dataLoaded) return <LoadingScreen />;

  let Page;
  switch (screen) {
    case "home":         Page = <Home />;          break;
    case "patchnotes":   Page = <PatchNotes />;    break;
    case "achievements": Page = <Achievements />;  break;
    case "credits":      Page = <Credits />;       break;
    case "select":      Page = <ChampionSelect />; break;
    case "map":         Page = <Map />;           break;
    case "combat":      Page = <Combat />;        break;
    case "shop":        Page = <Shop />;          break;
    case "reward":      Page = <Reward />;        break;
    case "event":       Page = <Event />;         break;
    case "gameover":    Page = <GameOver />;      break;
    case "victory":     Page = <Victory />;       break;
    default:            Page = <LoadingScreen error={dataError} />; break;
  }

  return (
    <>
      {Page}
      <TutorialCard />
      <Jumpscare />
      <AchievementToast />
      <SorakaBlessing />
    </>
  );
}

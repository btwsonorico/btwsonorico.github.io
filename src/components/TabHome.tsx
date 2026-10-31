import { useEffect, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";

// Tab della home. Comunica con la pagina con l'evento "home:tab" e tiene la tab nell'indirizzo (#projects).
const TAB = [
  { value: "knowledge", label: "Knowledge" },
  { value: "projects", label: "Projects" },
];

export default function TabHome() {
  const [tab, setTab] = useState(() => (window.location.hash === "#projects" ? "projects" : "knowledge"));

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("home:tab", { detail: tab }));
  }, [tab]);

  function cambia(v: string) {
    history.replaceState(null, "", v === "projects" ? "#projects" : window.location.pathname);
    setTab(v);
  }

  return <SegmentedControl label="Section" options={TAB} value={tab} onValueChange={cambia} />;
}

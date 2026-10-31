import { useEffect, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";

// Tab della home. Comunica con la pagina con l'evento "home:tab" e tiene la tab nell'indirizzo (#projects, #advisory).
const TAB = [
  { value: "knowledge", label: "Knowledge" },
  { value: "projects", label: "Projects" },
  { value: "advisory", label: "Advisory" },
];
const daIndirizzo = () => TAB.find(t => t.value !== "knowledge" && window.location.hash === `#${t.value}`)?.value ?? "knowledge";

export default function TabHome() {
  const [tab, setTab] = useState(daIndirizzo);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("home:tab", { detail: tab }));
  }, [tab]);

  function cambia(v: string) {
    history.replaceState(null, "", v === "knowledge" ? window.location.pathname : `#${v}`);
    setTab(v);
  }

  return <SegmentedControl label="Section" options={TAB} value={tab} onValueChange={cambia} />;
}

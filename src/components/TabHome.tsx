import { useEffect, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";

// Tab della home. Comunica con la pagina con l'evento "home:tab" e tiene la tab nell'indirizzo (#knowledge, #advisory).
// SW engineering (valore "projects") è la prima tab e quella aperta all'avvio.
const TAB = [
  { value: "projects", label: "SW engineering" },
  { value: "advisory", label: "Advisory" },
  { value: "knowledge", label: "Knowledge" },
];
const daIndirizzo = () => TAB.find(t => t.value !== "projects" && window.location.hash === `#${t.value}`)?.value ?? "projects";

export default function TabHome() {
  const [tab, setTab] = useState(daIndirizzo);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("home:tab", { detail: tab }));
  }, [tab]);

  function cambia(v: string) {
    history.replaceState(null, "", v === "projects" ? window.location.pathname : `#${v}`);
    setTab(v);
  }

  return <SegmentedControl label="Section" options={TAB} value={tab} onValueChange={cambia} />;
}

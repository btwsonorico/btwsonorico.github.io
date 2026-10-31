import { useEffect, useState } from "react";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";

// Tab della home. Comunica con la pagina con l'evento "home:tab" e tiene la tab nell'indirizzo (#projects, #knowledge).
// Advisory è la prima tab e quella aperta all'avvio.
const TAB = [
  { value: "advisory", label: "Advisory" },
  { value: "projects", label: "Projects" },
  { value: "knowledge", label: "Knowledge" },
];
const daIndirizzo = () => TAB.find(t => t.value !== "advisory" && window.location.hash === `#${t.value}`)?.value ?? "advisory";

export default function TabHome() {
  const [tab, setTab] = useState(daIndirizzo);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("home:tab", { detail: tab }));
  }, [tab]);

  function cambia(v: string) {
    history.replaceState(null, "", v === "advisory" ? window.location.pathname : `#${v}`);
    setTab(v);
  }

  return <SegmentedControl label="Section" options={TAB} value={tab} onValueChange={cambia} />;
}

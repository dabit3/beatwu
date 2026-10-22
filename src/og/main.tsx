import "@fontsource/bangers";
import "@fontsource-variable/inter";
import "../styles/base.css";
import "./og.css";
import { createRoot } from "react-dom/client";
import { OgCard, OgIcon } from "./OgCard";

createRoot(document.getElementById("root")!).render(location.hash === "#icon" ? <OgIcon /> : <OgCard />);

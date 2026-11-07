import { useEffect, useState } from "react";
import Debug from "./Debug";
import Home from "./Home";

function useRoute() {
  const get = () => (window.location.hash.startsWith("#/debug") || window.location.pathname.startsWith("/debug") ? "debug" : "home");
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  if (route === "debug") return <Debug />;
  return <Home />;
}

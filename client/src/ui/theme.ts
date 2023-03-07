import { UseLocalStorage } from "../types";

export const useLocalStorage = ({ name, value }: UseLocalStorage) => {
  if (value) {
    localStorage.setItem(name, value);
    return value;
  }

  const jsonValue = localStorage.getItem(name);
  if (jsonValue) return jsonValue;

  return "";
};

export const getTheme = () => {
  const theme = useLocalStorage({ name: "theme" });
  if (
    theme === "dark" ||
    (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.body.classList.add("dark");
  }
  document
    .querySelector("#change-theme")
    ?.addEventListener("click", toggleTheme);
};

const toggleTheme = () => {
  const theme = useLocalStorage({ name: "theme" });
  if (theme === "dark") {
    document.body.classList.remove("dark");
    return useLocalStorage({ name: "theme", value: "light" });
  }
  document.body.classList.add("dark");
  return useLocalStorage({ name: "theme", value: "dark" });
};

///////////////////////////////////////////////
export const addBackground = () => {
  const sonarContainer = document.getElementsByClassName("sonar-container")[0];
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const sonarMaxWidth = vh > vw ? vh : vw;
  let currentWidth = 90;
  let opacity = 0.1;
  while (currentWidth < sonarMaxWidth) {
    const span = document.createElement("span");
    span.classList.add("sonar", "center");
    span.style.width = currentWidth + "px";
    span.style.height = currentWidth + "px";
    span.style.opacity = `${opacity}`;
    if (opacity < 0.8) opacity += 0.1;
    sonarContainer.appendChild(span);
    currentWidth += vh > vw ? 300 : 400;
  }
};

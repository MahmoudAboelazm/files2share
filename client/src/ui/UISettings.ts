import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { Observable } from "../lib/Observable";
import { useLocalStorage } from "./theme";
import { MyDeviceInfo } from "../types";

export class UISettings {
  private currentSelectedOption: Element;
  private parentOptions: Element;
  private avatarStyle: string;
  private avatarName: string;
  private settingsObserver: Observable<MyDeviceInfo>;

  constructor(ob: Observable<MyDeviceInfo>) {
    this.settingsObserver = ob;
  }
  init() {
    const settings = document.getElementsByClassName("settings")[0];
    const nameRegenerate = settings.children[1];
    const parentOptions = settings.children[0];
    const options = parentOptions.children[1];
    const btnSettings = parentOptions.children[0] as HTMLAnchorElement;

    parentOptions.addEventListener("click", () => this.optionsToggleHide());
    nameRegenerate.addEventListener("click", () => this.regenerateName());
    this.getDeviceInfo();
    this.optionsInit(options, btnSettings);
    this.generateDeviceInfo();

    this.parentOptions = parentOptions;
  }

  private optionsInit(options: Element, btnSettings: HTMLAnchorElement) {
    const optionsLength = options.children.length;
    let nextFocused: HTMLLIElement;
    let preFocused: HTMLLIElement;
    for (let i = 0; i < optionsLength; i++) {
      const el = options.children[i] as HTMLLIElement;
      const dataId = el.getAttribute("dataId");
      if (dataId == this.avatarStyle) {
        el.classList.add("active");
        this.currentSelectedOption = el;
      }
      el.addEventListener("click", () => this.optionOnClick(el));
      el.onkeyup = (e) => {
        if (e.key == "ArrowDown") {
          nextFocused = options.children[i + 1] as HTMLLIElement;
          preFocused = el;
          if (nextFocused) return nextFocused.focus();
          btnSettings.focus();
        }
        if (e.key == "Enter") return this.optionOnClick(el);
        if (e.key == "ArrowUp") {
          nextFocused = el;
          preFocused = options.children[i - 1] as HTMLLIElement;
          if (preFocused) return preFocused.focus();
          btnSettings.focus();
        }
      };
    }
  }

  private getDeviceInfo() {
    let avatarName = useLocalStorage({ name: "avatarName" });
    let avatarStyle = useLocalStorage({ name: "avatarStyle" });
    avatarName ? (this.avatarName = avatarName) : this.setAvatarName();
    avatarStyle ? (this.avatarStyle = avatarStyle) : this.setAvatarSyle();
  }

  private optionOnClick(el: Element) {
    this.currentSelectedOption.classList.remove("active");
    el.classList.add("active");
    const style = el.getAttribute("dataId");
    this.setAvatarSyle(style!);
    this.generateDeviceInfo();
    this.currentSelectedOption = el;
  }

  private setAvatarSyle(style?: string) {
    if (style) {
      this.avatarStyle = style;
      useLocalStorage({ name: "avatarStyle", value: style });
      return;
    }
    const avatarStyle = "adventurer-neutral";
    this.avatarStyle = avatarStyle;
    useLocalStorage({ name: "avatarStyle", value: avatarStyle });
  }

  private setAvatarName(name?: string) {
    if (name) {
      this.avatarName = name;
      useLocalStorage({ name: "avatarName", value: name });
      return;
    }

    const avatarName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: "_",
      style: "capital",
    });
    this.avatarName = avatarName;
    useLocalStorage({ name: "avatarName", value: avatarName });
  }

  private optionsToggleHide() {
    this.parentOptions.classList.toggle("hide");
  }

  private generateDeviceInfo() {
    const size = this.avatarStyle == "adventurer" ? 75 : 65;
    const imgURL = `https://avatars.dicebear.com/api/${this.avatarStyle}/${this.avatarName}.svg?size=${size}`;
    this.settingsObserver.next({ randomName: this.avatarName, imgURL });
  }

  private regenerateName() {
    this.setAvatarName();
    this.generateDeviceInfo();
  }
}

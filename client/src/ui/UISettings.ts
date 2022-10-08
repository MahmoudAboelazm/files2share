import * as adventurer from "@dicebear/adventurer";
import * as adventurerNeutral from "@dicebear/adventurer-neutral";
import * as avataaars from "@dicebear/avatars-avataaars-sprites";
import * as bottts from "@dicebear/avatars-bottts-sprites";
import * as initials from "@dicebear/avatars-initials-sprites";
import * as openPeeps from "@dicebear/open-peeps";
import { createAvatar } from "@dicebear/avatars";
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { Observable } from "../lib/Observable";
import { useLocalStorage } from "./theme";

const avatarStyles: { [key: string]: any } = {
  adventurer,
  adventurerNeutral,
  avataaars,
  bottts,
  initials,
  openPeeps,
};

export class UISettings {
  private currentSelectedOption: Element;
  private parentOptions: Element;
  private avatarStyle: string;
  private avatarName: string;
  private settingsObserver: Observable;

  constructor(ob: Observable) {
    this.settingsObserver = ob;
  }
  init() {
    const settings = document.getElementsByClassName("settings")[0];
    const nameRegenerate = settings.children[1];
    const parentOptions = settings.children[0];
    const options = parentOptions.children[1];

    parentOptions.addEventListener("click", () => this.optionsToggleHide());
    nameRegenerate.addEventListener("click", () => this.regenerateName());
    this.getDeviceInfo();
    this.optionsInit(options);
    this.generateDeviceInfo();

    this.parentOptions = parentOptions;
  }

  private optionsInit(options: Element) {
    const optionsLength = options.children.length;
    for (let i = 0; i < optionsLength; i++) {
      const el = options.children[i];
      const dataId = el.getAttribute("dataId");
      if (dataId == this.avatarStyle) {
        el.classList.add("active");
        this.currentSelectedOption = el;
      }
      el.addEventListener("click", () => this.optionOnClick(el));
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
    const avatarStyle = "adventurerNeutral";
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
      separator: " ",
      style: "capital",
    });
    this.avatarName = avatarName;
    useLocalStorage({ name: "avatarName", value: avatarName });
  }

  private optionsToggleHide() {
    this.parentOptions.classList.toggle("hide");
  }

  private generateDeviceInfo() {
    const style = avatarStyles[this.avatarStyle];
    const imgURL = createAvatar(style, {
      seed: this.avatarName,
      dataUri: true,
      size: this.avatarStyle == "adventurer" ? 75 : 65,
    });
    this.settingsObserver.next({ randomName: this.avatarName, imgURL });
  }

  private regenerateName() {
    this.setAvatarName();
    this.generateDeviceInfo();
  }
}

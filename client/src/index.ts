import UIManager from "./ui/UIManager";

const ui = new UIManager();
ui.init();
ui.serverConnect();
/**
 * TODOS:
 * 1- Show transfer rate/second
 * 2- Show how many files transfered
 * 3- Cancel transfer
 * 4- Estimated time
 * 6- File size & transfered size
 * 5- show if the device is busy
 * 6- add more to prevent duplicate
 * 7- remove all prevent duplicates files
 * 8- option to select the avatar & the name in the client side instead of sending them from the backend
 */

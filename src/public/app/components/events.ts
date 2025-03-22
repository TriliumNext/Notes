import type { MenuCommandItem } from "../menus/context_menu.js";
import type { CommandNames } from "./app_context.js";

type ListenerReturnType = void | Promise<void>;

export interface SelectMenuItemEventListener<T extends CommandNames> {
    selectMenuItemHandler(item: MenuCommandItem<T>): ListenerReturnType;
}

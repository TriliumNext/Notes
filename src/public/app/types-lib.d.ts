// TODO: Use real @types/ but that one generates a lot of errors.
declare module "draggabilly" {
    type DraggabillyEventData = {};
    interface MoveVector {
        x: number;
        y: number;
    }
    type DraggabillyCallback = (event: unknown, pointer: unknown, moveVector: MoveVector) => void;
    export default class Draggabilly {
        constructor(el: HTMLElement, opts: {
            axis: "x" | "y";
            handle: string;
            containment: HTMLElement
        });
        element: HTMLElement;
        on(event: "pointerDown" | "dragStart" | "dragEnd" | "dragMove", callback: Callback)
        dragEnd();
        isDragging: boolean;
        positionDrag: () => void;
        destroy();
    }
}

declare module '@mind-elixir/node-menu' {
    export default mindmap;
}

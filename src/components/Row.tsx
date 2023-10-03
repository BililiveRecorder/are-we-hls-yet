import { createEffect, type Component, type JSX, type ParentComponent } from "solid-js";
import { show } from "../toggleStore";

const Row: ParentComponent<{ ignore: boolean }> = (props) => {
    return (<div classList={{ hidden: !props.ignore && !show() }}>
        {props.children}
    </div>);
};

export default Row;

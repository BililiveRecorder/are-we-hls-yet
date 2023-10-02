import { createEffect, type Component, type JSX, type ParentComponent } from "solid-js";
import { showYing } from "../showYingStore";

const Row: ParentComponent<{ ignore: boolean }> = (props) => {
    return (<div classList={{ hidden: !props.ignore && !showYing() }}>
        {props.children}
    </div>);
};

export default Row;

import { createEffect, type Component } from "solid-js";
import { show, setShow } from "../toggleStore";

const Toggle: Component = () => {
    return (<div class="text-2xl cursor-pointer">
        <input type="checkbox" class="cursor-pointer" id="ying" name="ying" checked={show()} onChange={(e) => setShow(e.currentTarget.checked)} />
        <label for="ying" class="ml-2 cursor-pointer" title="是否显示能正常录制的分区">苟？</label>
    </div>);
};

export default Toggle;

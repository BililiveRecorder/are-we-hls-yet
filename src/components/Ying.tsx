import { createEffect, type Component } from "solid-js";
import { showYing, setShowYing } from "../showYingStore";

const Ying: Component = () => {
    return (<div class="text-2xl cursor-pointer">
        <input type="checkbox" class="cursor-pointer" id="ying" name="ying" checked={showYing()} onChange={(e) => setShowYing(e.currentTarget.checked)} />
        <label for="ying" class="ml-2 cursor-pointer">赢？</label>
    </div>);
};

export default Ying;

import "./env";
import { dataMode } from "../src/lib/data-mode";
if(dataMode()!=="mock")throw new Error("Mock seed is forbidden outside explicit development mock mode.");
console.log("Mock mode reads code fixtures only. This command never inserts fake facilities into a database.");

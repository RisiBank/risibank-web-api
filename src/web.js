import { RisiBank } from "./RisiBank";


// Attach RisiBank to the window object
if (typeof window !== 'undefined') {
    window.RisiBank = new RisiBank();
}

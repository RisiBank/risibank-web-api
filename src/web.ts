import { RisiBank } from './RisiBank';

// Attach RisiBank to the window object
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).RisiBank = new RisiBank();
}

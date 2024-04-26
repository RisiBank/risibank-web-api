import { ActivateOptions } from './RisiBank';
import { UI } from './UI';

/**
 * Global defaults
 */
const globalDefault: Partial<ActivateOptions> = {
    // Global recommended defaults
    defaultTab: 'top',
    showNSFW: false,
    allowUsernameSelection: true,
    showCopyButton: false,
    onCopyMedia: undefined,

    // To be set by user
    onSelectMedia: undefined,
};

/**
 * Each theme with its own defaults
 */
const themeDefaults = {
    Light: { theme: 'light' },
    Dark: { theme: 'dark' },
    LightClassic: { theme: 'light-old' },
    DarkClassic: { theme: 'dark-old' },
};

/**
 * Build a default config for each theme
 */
const buildConfig = (config: Partial<ActivateOptions>) => {
    return Object.entries(themeDefaults).reduce((acc, [key, value]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc as any)[key] = { ...globalDefault, ...value, ...config };
        return acc;
    }, {});
};

/**
 * Set of default recommended options for the web-api.
 */
export class Defaults {
    static get Frame() {
        return buildConfig({
            container: undefined,
            type: 'iframe',
            mediaSize: 'md',
            navbarSize: 'md',
        });
    }

    static get Modal() {
        return buildConfig({
            openPosition: UI.getPreferredModalOpenPosition(),
            type: 'modal',
            mediaSize: 'md',
            navbarSize: 'lg',
        });
    }

    static get Overlay() {
        return buildConfig({
            type: 'overlay',
            mediaSize: 'lg',
            navbarSize: 'lg',
        });
    }
}

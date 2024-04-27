import { Actions } from './Actions.js';
import { Constants } from './Constants.js';
import { Defaults } from './Defaults.js';
import { UI } from './UI.js';
import { ActionCallback } from './types.js';

export interface ActivateOptions {
    /**
     * Type of integration to use.
     * Currently only the iframe is supported.
     *  iframe: Embedded iframe (default)
     *  overlay: Opens a full-page overlay
     *  modal: Opens a small modal at the specified position
     */
    type: 'iframe' | 'overlay' | 'modal';

    /**
     * Selection callback. When a media is selected, this callback is called.
     *
     * Default callbacks are provided in the RisiBank object:
     *  RisiBank.addSourceImageToTextArea(querySelector)    -> adds the selected source image (e.g. noelshack) to the textarea
     *  RisiBank.addRisiBankImageToTextArea(querySelector)  -> adds the selected risibank image to the textarea
     *
     * You can also create your own callbacks, e.g.
     *  onSelect: ({ id, type, media }) => { console.log(media, 'selected'); }
     */
    onSelectMedia: ActionCallback;

    /**
     * MUST BE SET IF type == 'iframe'
     * Query selector for the iframe container, or HTML Element being the iframe container.
     */
    container?: string | HTMLElement;

    /**
     * MUST BE SET IF type == 'modal'
     * Position where to show the modal
     */
    openPosition?: { x: number; y: number };

    /**
     * Theme to use for the embed
     */
    theme?: 'light' | 'dark' | 'light-old' | 'dark-old';

    /**
     * Media size in the embed. Default is md.
     */
    mediaSize?: 'sm' | 'md' | 'lg';

    /**
     * Bottom navigation navbar size. Default is md.
     */
    navbarSize?: 'sm' | 'md' | 'lg';

    /**
     * Default tab to show. If chosing a non-existent tab, will show the most popular.
     */
    defaultTab?: 'search' | 'fav' | 'hot' | 'top' | 'new' | 'rand';

    /**
     * Whether to show NSFW content. Default is to show it.
     */
    showNSFW?: boolean;

    /**
     * Whether to allow username selection in the embed.
     * If set to yes
     *  - Users will be able to select an username within the embed.
     * 	- The selected username will be automatically storred by this object using the LocalStorage API.
     * 	- The public collections of the selected user will be shown in the embed.
     * If set to no, it will not be possible to select an user within the embed.
     */
    allowUsernameSelection?: boolean;

    /**
     * Whether to show a copy button below all medias
     * When clicked, this copy button will call the given onCopyMedia
     */
    showCopyButton?: boolean;

    /**
     * Callback when the copy button is shown (only used if showCopyButton is set to true)
     */
    onCopyMedia?: ActionCallback;
}

export class RisiBank {
    static Actions = Actions;
    static Constants = Constants;
    static Defaults = Defaults;
    static UI = UI;

    /**
     * Tracks integrations to their callbacks
     */
    private static _integrations: Record<number, ActivateOptions> = {};

    /**
     * Saved overlay container
     */
    private static _overlayContainer: HTMLElement | null = null;

    /**
     * Saved modal container
     */
    private static _modalContainer: HTMLElement | null = null;

    /**
     * All calls to activate() generate a new id
     * Starts at 2 because:
     * - 0 is reserved for the overlay
     * - 1 is reserved for the modal
     */
    private static _currentIntegrationId: number = 2;

    /**
     * The selected username
     */
    private static selectedUsername: string | null = null;

    static init() {
        // Try to load selected username from local storage if possible
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('risibank-userscript-selected-username');
            // Check saved data is valid to avoid pollution through localStorage
            if (typeof saved === 'string' && saved.match(/^[a-zA-Z0-9\][_-]+$/i)) {
                RisiBank.setSelectedUsername(saved);
            }
        }

        // Listen for resulting events
        if (typeof window !== 'undefined') {
            window.addEventListener('message', RisiBank.onIFrameMessage.bind(this), false);
        }
    }

    /**
     * Saves the selected username
     */
    static setSelectedUsername(username: string | null) {
        // If erasing selected username
        if (username === null || typeof username !== 'string') {
            RisiBank.selectedUsername = null;
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('risibank-userscript-selected-username');
            }
            return;
        }
        RisiBank.selectedUsername = username;

        // If local storage is set, save into local storage
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('risibank-userscript-selected-username', username);
        }
    }

    static activate(options: ActivateOptions) {
        // Get type
        options.type = options.type || 'iframe';
        if (!['iframe', 'overlay', 'modal'].includes(options.type)) {
            throw new Error('Invalid type');
        }

        // Verify that the theme is valid
        options.theme = options.theme || 'light';
        if (!['light', 'dark', 'light-old', 'dark-old'].includes(options.theme)) {
            throw new Error('Unsupported theme');
        }

        // Media size
        options.mediaSize = options.mediaSize || 'md';
        if (!['sm', 'md', 'lg'].includes(options.mediaSize)) {
            throw new Error('Unsupported media size. Allowed sizes are sm, md and lg');
        }

        // Navbar size
        options.navbarSize = options.navbarSize || 'md';
        if (!['sm', 'md', 'lg'].includes(options.navbarSize)) {
            throw new Error('Unsupported navbar size. Allowed sizes are sm, md and lg');
        }

        // Default tab
        options.defaultTab = options.defaultTab || 'top';
        if (!['search', 'fav', 'hot', 'top', 'new', 'rand'].includes(options.defaultTab)) {
            throw new Error('Unsupported default tab. Allowed values are search, fav, hot, top, new and rand');
        }

        // Show NSFW
        options.showNSFW = typeof options.showNSFW === 'boolean' ? options.showNSFW : true;

        // Username selection
        options.allowUsernameSelection = typeof options.allowUsernameSelection === 'boolean' ? options.allowUsernameSelection : true;

        // Show copy button
        options.showCopyButton = typeof options.showCopyButton === 'boolean' ? options.showCopyButton : false;

        // Verify that the callback is valid
        const onSelectMedia = options.onSelectMedia;
        if (typeof onSelectMedia !== 'function') {
            throw new Error('A callback must be specified for when a media is selected');
        }

        // Frame
        if (options.type === 'iframe') {
            ++RisiBank._currentIntegrationId;

            // Get container
            if (typeof options.container === 'undefined') {
                throw new Error('A container must be specified when type is iframe');
            }
            const container =
                typeof options.container === 'string' ? document.querySelector<HTMLElement>(options.container) : options.container;
            if (!container) {
                throw new Error('Invalid container specified');
            }

            RisiBank.populateContainerWithIFrame(options, container, RisiBank._currentIntegrationId);
            RisiBank._integrations[RisiBank._currentIntegrationId] = options;
        }

        // Overlay
        if (options.type === 'overlay') {
            if (!RisiBank._overlayContainer) {
                const container = document.createElement('div');
                container.id = 'risibank-overlay';
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.zIndex = '2000000001';
                container.style.opacity = '0.9';
                container.style.backgroundColor = 'rgba(0,0,0,0.5)';
                document.body.appendChild(container);
                RisiBank._overlayContainer = container;
            }
            RisiBank._overlayContainer.style.display = 'block';

            RisiBank.populateContainerWithIFrame(options, RisiBank._overlayContainer, 0);
            RisiBank._integrations[0] = options;
        }

        // Modal
        if (options.type === 'modal') {
            if (typeof options.openPosition === 'undefined') {
                throw new Error('A position must be specified when type is modal');
            }

            // Find target position
            if (!RisiBank._modalContainer) {
                const container = document.createElement('div');
                container.id = 'risibank-modal';
                container.style.position = 'fixed';
                container.style.width = '600px';
                container.style.height = '300px';
                container.style.zIndex = '2000000000';
                container.style.opacity = '1';
                document.body.appendChild(container);
                RisiBank._modalContainer = container;
            }
            RisiBank._modalContainer.style.display = 'block';
            RisiBank._modalContainer.style.pointerEvents = 'all';

            // Update position
            RisiBank._modalContainer.style.left = options.openPosition.x + 'px';
            RisiBank._modalContainer.style.top = options.openPosition.y + 'px';

            RisiBank.populateContainerWithIFrame(options, RisiBank._modalContainer, 1);
            RisiBank._integrations[1] = options;
        }
    }

    private static getEmbedUrl(options: ActivateOptions, integrationId: number): string {
        let url = `${Constants.RISIBANK_URL}/embed?id=${integrationId}`;
        url += `&theme=${options.theme}`;
        url += `&allowUsernameSelection=${options.allowUsernameSelection}`;
        url += `&showCopyButton=${options.showCopyButton}`;
        url += `&mediaSize=${options.mediaSize}`;
        url += `&navbarSize=${options.navbarSize}`;
        url += `&defaultTab=${options.defaultTab}`;
        url += `&showNSFW=${options.showNSFW}`;
        if (['overlay', 'modal'].includes(options.type)) {
            url += '&showCloseButton=true';
        }
        if (options.allowUsernameSelection) {
            if (typeof RisiBank.selectedUsername === 'string') {
                url += `&username=${RisiBank.selectedUsername}`;
            }
        }
        return url;
    }

    private static hashOptions(options: ActivateOptions) {
        return JSON.stringify([
            options.theme,
            options.allowUsernameSelection,
            options.showCopyButton,
            options.mediaSize,
            options.navbarSize,
            options.defaultTab,
            options.type,
        ]);
    }

    private static populateContainerWithIFrame(options: ActivateOptions, container: HTMLElement, integrationId: number) {
        const containerHash = RisiBank.hashOptions(options);
        // Check if the container is already populated
        const previousIFrame = container.querySelector('iframe');
        if (previousIFrame) {
            const iframeHash = previousIFrame.getAttribute('data-hash');
            if (iframeHash === containerHash) {
                // The container is already populated with the same content
                container.style.display = 'block';
                return;
            }
        }
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = RisiBank.getEmbedUrl(options, integrationId);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.setAttribute('data-hash', containerHash);
        container.innerHTML = '';
        container.appendChild(iframe);
    }

    /**
     * When en event is received from the iframe using postMessage
     */
    private static onIFrameMessage(event: MessageEvent) {
        // Verify that the event has data and data type is from risibank
        if (!event.data || !event.data.type || !event.data.type.match(/^risibank/)) {
            return;
        }
        // Trust only RisiBank
        if (event.origin !== Constants.RISIBANK_URL) {
            console.log('ignoring event due to origin mismatch', event);
            return;
        }
        // Extract data
        const id = event.data.id;
        const type = event.data.type;
        // Closed (only in overlay)
        if (type === 'risibank-closed') {
            RisiBank.desactivate(id);
            return;
        }
        // Username selected
        if (type === 'risibank-username-selected') {
            const username = event.data.username;
            RisiBank.setSelectedUsername(username);
            return;
        }
        // Username cleared
        if (type === 'risibank-username-cleared') {
            RisiBank.setSelectedUsername(null);
            return;
        }
        // Media link copy
        if (type === 'risibank-media-copy') {
            const integration = RisiBank._integrations[id];
            if (integration?.onCopyMedia) {
                integration.onCopyMedia({
                    id,
                    type,
                    media: event.data.media,
                });
            }
            return;
        }
        // Media selected
        if (type === 'risibank-media-selected') {
            const integration = RisiBank._integrations[id];
            if (integration?.onSelectMedia) {
                integration.onSelectMedia({
                    id,
                    type,
                    media: event.data.media,
                });
            }
            if (RisiBank._integrations[id] && ['overlay', 'modal'].includes(RisiBank._integrations[id].type)) {
                RisiBank.desactivate(id);
            }
            return;
        }
    }

    /**
     * Desactivate a all or a specific integration
     */
    static desactivate(id: number | undefined) {
        // If id is not given, desactivate all
        if (typeof id === 'undefined') {
            for (const id in RisiBank._integrations) {
                RisiBank.desactivate(parseInt(id, 10));
            }
            return;
        }

        const options = RisiBank._integrations[id];

        if (!options) {
            return;
        }

        // IFrame
        if (options.type === 'iframe') {
            RisiBank.desactivateIFrame(options, id);
        }

        // Overlay
        if (options.type === 'overlay') {
            RisiBank.desactivateOverlay();
        }

        // Modal
        if (options.type === 'modal') {
            RisiBank.desactivateModal();
        }
    }

    private static desactivateIFrame(options: ActivateOptions, id: number) {
        const container = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
        if (!container) {
            return;
        }
        container.innerHTML = '';
        // Delete options
        delete RisiBank._integrations[id];
    }

    private static desactivateOverlay() {
        const container = document.querySelector('#risibank-overlay') as HTMLElement;
        if (!container) {
            return;
        }
        container.style.display = 'none';
    }

    private static desactivateModal() {
        const container = document.querySelector('#risibank-modal') as HTMLElement;
        if (!container) {
            return;
        }
        container.style.display = 'none';
        container.style.pointerEvents = 'none';
    }
}

RisiBank.init();

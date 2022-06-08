import { Defaults } from "./Defaults";
import { UI } from "./UI";
import { Actions } from "./Actions";


/**
 * @typedef {{
 * 
 *  type: 'iframe' | 'overlay' | 'modal',
 * 
 *  // String or HTMLElement if type is iframe
 *  // Undefined if type is overlay or modal
 *  container?: String | HTMLElement,
 *  
 *  // Must be set if type is modal
 *  openPosition?: { x: number, y: number },
 * 
 *  theme?: 'light' | 'dark' | 'light-old' | 'dark-old',
 *  mediaSize?: 'sm' | 'md' | 'lg',
 *  navbarSize?: 'sm' | 'md' | 'lg',
 *  defaultTab?: 'search' | 'fav' | 'hot' | 'top' | 'new' | 'rand',
 *  showNSFW?: Boolean,
 * 
 *  allowUsernameSelection?: Boolean,
 *  showCopyButton?: Boolean,
 * 
 *  onCopyMedia?: Function,
 *  onSelectMedia: Function,
 * }} ActivateOptions
 */


export class RisiBank {

    static Defaults = Defaults;
    static UI = UI;
    static Actions = Actions;

    constructor() {

        this._location = 'https://risibank.fr';
        //this._location = 'http://localhost';

        // Tracks integrations to their callbacks
        this._integrations = { };

        // Saved overlay container
        this._overlayContainer = null;

        // Saved modal container
        this._modalContainer = null;

        // All calls to activate() generate a new id
        // Starts at 2 because:
        // - 0 is reserved for the overlay
        // - 1 is reserved for the modal
        this._currentIntegrationId = 2;

        // The selected username
        this._selectedUsername = null;
        // Try to load selected username from local storage if possible
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('risibank-userscript-selected-username');
            // Check saved data is valid to avoid pollution through localStorage
            if (typeof saved === 'string' && saved.match(/^[a-zA-Z0-9\]\[_-]+$/i)) {
                this._selectedUsername = saved;
            }
        }

        // Register utility classes
        this.Defaults = Defaults;
        this.UI = UI;
        this.Actions = Actions;
        // Retro-compatibility
        this.addImageToTextArea = Actions.addImageLink;
        this.addSourceImageToTextArea = Actions.addSourceImageLink;
        this.addRisiBankImageToTextArea = Actions.addRisiBankImageLink;

        // Listen for resulting events
        addEventListener("message", this._onIFrameMessage.bind(this), false);
    }

    /**
     * 
     * @param {ActivateOptions} options 
     */
    activate(options) {

        // Get type
        options.type = options.type || 'iframe';
        if (! ['iframe', 'overlay', 'modal'].includes(options.type)) {
            throw new Error('Invalid type');
        }

        // Verify that the theme is valid
        options.theme = options.theme || 'light';
        if (! ['light', 'dark', 'light-old', 'dark-old'].includes(options.theme)) {
            throw new Error('Unsupported theme');
        }

        // Media size
        options.mediaSize = options.mediaSize || 'md';
        if (! ['sm', 'md', 'lg'].includes(options.mediaSize)) {
            throw new Error('Unsupported media size. Allowed sizes are sm, md and lg');
        }

        // Navbar size
        options.navbarSize = options.navbarSize || 'md';
        if (! ['sm', 'md', 'lg'].includes(options.navbarSize)) {
            throw new Error('Unsupported navbar size. Allowed sizes are sm, md and lg');
        }

        // Default tab
        options.defaultTab = options.defaultTab || 'top';
        if (! ['search', 'fav', 'hot', 'top', 'new', 'rand'].includes(options.defaultTab)) {
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

            ++ this._currentIntegrationId;

            // Get container
            if (typeof options.container === 'undefined') {
                throw new Error('A container must be specified when type is iframe');
            }
            const container = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
            if (! container) {
                throw new Error('Invalid container specified');
            }
            
            this._populateContainerWithIFrame(options, container, this._currentIntegrationId);
            this._integrations[this._currentIntegrationId] = options;
        }

        // Overlay
        if (options.type === 'overlay') {

            if (! this._overlayContainer) {
                const container = document.createElement('div');
                container.id = `risibank-overlay`;
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.zIndex = '2000000001';
                container.style.opacity = 0.9;
                container.style.backgroundColor = 'rgba(0,0,0,0.5)';
                document.body.appendChild(container);
                this._overlayContainer = container;
            }
            this._overlayContainer.style.display = 'block';
            
            this._populateContainerWithIFrame(options, this._overlayContainer, 0);
            this._integrations[0] = options;
        }

        // Modal
        if (options.type === 'modal') {

            if (typeof options.openPosition === 'undefined') {
                throw new Error('A position must be specified when type is modal');
            }

            // Find target position
            if (! this._modalContainer) {
                const container = document.createElement('div');
                container.id = 'risibank-modal';
                container.style.position = 'fixed';
                container.style.width = '600px';
                container.style.height = '300px';
                container.style.zIndex = '2000000000';
                container.style.opacity = 1;
                document.body.appendChild(container);
                this._modalContainer = container;
            }
            this._modalContainer.style.display = 'block';
            this._modalContainer.style.pointerEvents = 'all';

            // Update position
            this._modalContainer.style.left = options.openPosition.x + 'px';
            this._modalContainer.style.top = options.openPosition.y + 'px';

            this._populateContainerWithIFrame(options, this._modalContainer, 1);
            this._integrations[1] = options;
        }
    }

    /**
     * @param {ActivateOptions} options 
     * @param {number} integrationId
     * @returns {String}
     */
    _getEmbedUrl(options, integrationId) {
        let url = `${this._location}/embed?id=${integrationId}`;
        url += `&theme=${options.theme}`;
        url += `&allowUsernameSelection=${options.allowUsernameSelection}`;
        url += `&showCopyButton=${options.showCopyButton}`;
        url += `&mediaSize=${options.mediaSize}`;
        url += `&navbarSize=${options.navbarSize}`;
        url += `&defaultTab=${options.defaultTab}`;
        url += `&showNSFW=${options.showNSFW}`;
        if (['overlay', 'modal'].includes(options.type)) {
            url += `&showCloseButton=true`;
        }
        if (options.allowUsernameSelection) {
            if (typeof this.selectedUsername === 'string') {
                url += `&username=${this.selectedUsername}`;
            }
        }
        return url;
    }

    /**
     * @param {ActivateOptions} options 
     */
    _hashOptions(options) {
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

    /**
     * @param {ActivateOptions} options 
     * @param {HTMLElement} container 
     * @param {number} integrationId
     */
    _populateContainerWithIFrame(options, container, integrationId) {
        const containerHash = this._hashOptions(options);
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
        iframe.src = this._getEmbedUrl(options, integrationId);
        iframe.border = 'no';
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
     * @param {*} event 
     * @returns 
     */
    _onIFrameMessage(event) {

        // Verify that the event has data and data type is from risibank
        if (! event.data || ! event.data.type || ! event.data.type.match(/^risibank/)) {
            return;
        }
        // Trust only RisiBank
        if (event.origin !== this._location) {
            console.log('ignoring event due to origin mismatch', event);
            return;
        }
        // Extract data
        const id = event.data.id;
        const type = event.data.type;
        // Closed (only in overlay)
        if (type === 'risibank-closed') {
            this.desactivate(id);
            return;
        }
        // Username selected
        if (type === 'risibank-username-selected') {
            const username = event.data.username;
            this.selectedUsername = username;
            return;
        }
        // Username cleared
        if (type === 'risibank-username-cleared') {
            this.selectedUsername = null;
            return;
        }
        // Media link copy
        if (type === 'risibank-media-copy') {
            if (this._integrations[id] && this._integrations[id].onCopyMedia) {
                this._integrations[id].onCopyMedia({ id, type, media: event.data.media });
            }
            return;
        }
        // Media selected
        if (type === 'risibank-media-selected') {
            if (this._integrations[id] && this._integrations[id].onSelectMedia) {
                this._integrations[id].onSelectMedia({ id, type, media: event.data.media });
            }
            if (this._integrations[id] && ['overlay', 'modal'].includes(this._integrations[id].type)) {
                this.desactivate(id);
            }
            return;
        }
    }

    /**
     * Desactivate a all or a specific integration
     * @param {Number|undefined} id If given, will only desactivate the specified integration
     */
    desactivate(id) {

        // If id is not given, desactivate all
        if (typeof id === 'undefined') {
            for (const id in this._integrations) {
                this.desactivate(id);
            }
        }

        const options = this._integrations[id];

        if (! options) {
            return;
        }

        // IFrame
        if (options.type === 'iframe') {
            this._desactivateIFrame(options, id);
        }

        // Overlay
        if (options.type === 'overlay') {
            this._desactivateOverlay(options);
        }

        // Modal
        if (options.type === 'modal') {
            this._desactivateModal(options);
        }
    }

    /**
     * @param {ActivateOptions} options 
     * @param {Number} id 
     */
    _desactivateIFrame(options, id) {
        const container = document.querySelector(options.container);
        if (! container) {
            return;
        }
        container.innerHTML = '';
        // Delete options
        delete this._integrations[id];
    }

    /**
     * @param {ActivateOptions} options 
     */
    _desactivateOverlay(options) {
        const container = document.querySelector(`#risibank-overlay`);
        if (! container) {
            return;
        }
        container.style.display = 'none';
    }

    /**
     * @param {ActivateOptions} options 
     */
    _desactivateModal(options) {
        const container = document.querySelector(`#risibank-modal`);
        if (! container) {
            return;
        }
        container.style.display = 'none';
        container.style.pointerEvents = 'none';
    }

    /**
     * @returns {String|null} The previously saved username or null if none was saved
     */
    get selectedUsername() {
        return this._selectedUsername;
    }

    /**
     * Saves the selected username
     * @param {String|null} username 
     */
    set selectedUsername(username) {

        // If erasing selected username
        if (username === null || typeof username !== 'string') {
            this._selectedUsername = null;
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('risibank-userscript-selected-username');
            }
            return;
        }
        this._selectedUsername = username;

        // If local storage is set, save into local storage
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('risibank-userscript-selected-username', username);
        }
    }
}

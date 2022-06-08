

/**
 * Callbacks for the API actions.
 */
export class Actions {
    
    /**
     * Generate a callback for a given integration
     * @param {String|HTMLElement} selectorOrElement 
     * @param {'source'|'risibank'} linkType Link to add to the text area
     * @returns {Function}
     */
    static addImageLink(selectorOrElement, linkType) {
        return ({ id, data, media }) => {

            let formElement;
            if (typeof selectorOrElement === 'string') {
                formElement = document.querySelector(selectorOrElement);
            } else {
                formElement = selectorOrElement;
            }
            const link = linkType === 'source' ? media.source_url : media.cache_url;

            // Get cursor position
            const cursorIndex = formElement.selectionStart;

            // Decide whether to append and prepend spaces
            const preprendSpace = formElement.value[cursorIndex - 1] && ! formElement.value[cursorIndex - 1].match(/\s/);
            const appendSpace = typeof formElement.value[cursorIndex] === 'undefined' || ! formElement.value[cursorIndex].match(/\s/);

            // Build text to add
            const added = `${preprendSpace ? ' ' : ''}${link}${appendSpace ? ' ' : ''}`;

            // Insert link where cursor is
            formElement.value = formElement.value.substring(0, formElement.selectionStart) + added + formElement.value.substring(formElement.selectionStart);

            // Emit change event
            formElement.dispatchEvent(new Event('change'));
            formElement.dispatchEvent(new Event('input'));

            // Re-focus the text area
            formElement.focus();
        }
    }

    /**
     * Generate a callback to add a source image link (e.g. NoelShack) to a given text area
     * @param {String|HTMLElement} selectorOrElement 
     */
    static addSourceImageLink(selectorOrElement) {
        return Actions.addImageLink(selectorOrElement, 'source');
    }

    /**
     * Generate a callback to add a risibank image link to a given text area
     * @param {String|HTMLElement} selectorOrElement 
     */
    static addRisiBankImageLink(selectorOrElement) {
        return Actions.addImageLink(selectorOrElement, 'risibank');
    }

    /**
     * Paste the raw image data to the document
     */
    static pasteImage() {
        return async ({ id, data, media }) => {

            const response = await fetch(media.cache_url);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({
                [blob.type]: blob,
            })]);
            document.execCommand('paste');
        };
    }
}

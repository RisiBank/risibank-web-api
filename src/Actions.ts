import { ActionCallback } from './types.js';

type InputType = HTMLInputElement | HTMLTextAreaElement;

/**
 * Callbacks for the API actions.
 */
export class Actions {
    /**
     * Resolve a selector or element to an element, with optional fallback.
     */
    private static resolveElement<T extends Element>(
        selectorOrElement?: string | T,
        fallback?: Element | Document | null
    ): T | Element | Document {
        let target: T | Element | Document | null;
        if (typeof selectorOrElement === 'string') {
            target = document.querySelector<T>(selectorOrElement);
        } else {
            target = selectorOrElement || fallback || null;
        }
        if (!target) {
            throw new Error('Element not found');
        }
        return target;
    }

    /**
     * Set the value of an input or textarea element.
     * This method maximizes compatibility with different browsers and frameworks
     */
    static setInputValue(element: InputType, value: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const valueSetter = Object.getOwnPropertyDescriptor((element as any).__proto__, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
            valueSetter.call(element, value);
        } else {
            element.value = value;
        }
    
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * Generate a callback for a given integration
     */
    static addImageLink(selectorOrElement: string | InputType, linkType: 'source' | 'risibank'): ActionCallback {
        return ({ media }) => {
            const formElement = Actions.resolveElement<InputType>(selectorOrElement) as InputType;
            const link = linkType === 'source' ? media.source_url : media.cache_url;

            // Get cursor position
            const cursorIndex = formElement.selectionStart;

            // Decide whether to append and prepend spaces
            const preprendSpace = cursorIndex !== null && formElement.value[cursorIndex - 1] && !formElement.value[cursorIndex - 1].match(/\s/);
            const appendSpace = cursorIndex !== null && (typeof formElement.value[cursorIndex] === 'undefined' || !formElement.value[cursorIndex].match(/\s/));

            // Build text to add
            const added = `${preprendSpace ? ' ' : ''}${link}${appendSpace ? ' ' : ''}`;

            Actions.setInputValue(
                formElement,
                formElement.value.substring(0, cursorIndex ?? 0) +
                added +
                formElement.value.substring(cursorIndex ?? 0)
            );

            // Emit change event
            formElement.dispatchEvent(new Event('change'));
            formElement.dispatchEvent(new Event('input'));

            // Re-focus the text area
            formElement.focus();
        };
    }

    /**
     * Generate a callback to add a source image link (e.g. NoelShack) to a given text area
     */
    static addSourceImageLink(selectorOrElement: string | InputType): ActionCallback {
        return Actions.addImageLink(selectorOrElement, 'source');
    }

    /**
     * Generate a callback to add a risibank image link to a given text area
     */
    static addRisiBankImageLink(selectorOrElement: string | InputType): ActionCallback {
        return Actions.addImageLink(selectorOrElement, 'risibank');
    }

    /**
     * Paste the raw image data to the document by simulating a paste event.
     * This approach bypasses clipboard API limitations and works with GIFs.
     * @param selectorOrElement - Optional selector or element to dispatch the paste event to.
     *                            If provided, captures the target at activation time (before modal opens).
     *                            If not provided, falls back to document.activeElement at execution time.
     */
    static pasteImage(selectorOrElement?: string | Element): ActionCallback {
        return async ({ media }) => {
            const response = await fetch(media.cache_url);
            const blob = await response.blob();
            const fileName = media.cache_url.split('/').pop() || 'image';
            const file = new File([blob], fileName, { type: blob.type });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: dataTransfer,
            });
            const target = Actions.resolveElement(selectorOrElement, document.activeElement || document);
            target.dispatchEvent(pasteEvent);
        };
    }
}

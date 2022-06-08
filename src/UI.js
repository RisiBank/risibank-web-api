

/**
 * Utility class to handle UI.
 */
export class UI {

    /**
     * Automatically find the best position to open a modal based on active element and caret position
     * @returns {{ x: Number, y: Number }}
     */
    static getPreferredModalOpenPosition() {

        // Size of the modal in pixels
        const size = { width: 600, height: 300 };

        // Margin between elements
        const margin = 25;

        // No focused element?
        if (! document.activeElement) {
            return UI.adjustPositionForWindowBounds({
                x: window.innerWidth / 2 - size.width / 2,
                y: window.innerHeight / 2 - size.height / 2,
            }, size, margin);
        }
        
        // Bounding rect of focused element
        const bounding = document.activeElement.getBoundingClientRect();

        // If we do not have the place below to put the modal, we will put it above the element
        if (bounding.bottom + margin + size.height > window.innerHeight) {
            return UI.adjustPositionForWindowBounds({
                x: bounding.left,
                y: bounding.top - size.height - margin,
            }, size, margin);
        }

        // If other element, return position of element
        return UI.adjustPositionForWindowBounds({
            x: bounding.left,
            y: bounding.bottom + margin,
        }, size, margin);
    }

    /**
     * Ensures that a given element is visible in the viewport. Return new x/y position if it is not.
     */
    static adjustPositionForWindowBounds({ x, y }, { width, height }, margin) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Adjust x
        if (x + width + margin > windowWidth) {
            x = windowWidth - width - margin;
        }
        if (x < margin) {
            x = margin;
        }

        // Adjust y
        if (y + height + margin > windowHeight) {
            y = windowHeight - height - margin;
        }
        if (y < margin) {
            y = margin;
        }

        return { x, y };
    }
}

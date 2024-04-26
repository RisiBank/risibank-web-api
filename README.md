# RisiBank Web API

Integrate RisiBank in any front-end application 😎

## Intro

The RisiBank Web API is a tiny JS library, it has no dependency and weights around 3kb minified and gzipped.

It allows you to integrate RisiBank in your website in the way that you prefer (overlay, modal, embedded in the page somewhere) with custom styling, and let user select medias from RisiBank.

The RisiBank Web API is the base building block for any application that needs to use RisiBank anywhere on the web.

## Getting started

1. Install RisiBank using a package manager

    ```bash
    npm i --save risibank-web-api
    # or
    yarn add risibank-web-api
    ```

    or by saving the web bundle in [dist/risibank.js](./dist/risibank.js) and importing it using a script tag

    ```html
    <script src="./path/to/your/risibank.js"></script>
    ```

2. Import RisiBank using ES6 import

    ```javascript
    import { RisiBank } from 'risibank-web-api';
    ```

    if you are importing RisiBank Web API using a `script` tag, the `RisiBank` global variable is automatically available.

3. Open RisiBank

    ```javascript
    RisiBank.activate({
        /**
         * Use default options for Overlay + Dark
         * Other defaults are all combinations of Overlay/Modal/Frame and Light/Dark/LightClassic/DarkClassic, e.g. RisiBank.Defaults.Frame.LightClassic
         * @see https://github.com/RisiBank/risibank-web-api/blob/master/src/Defaults.js#L7
         */
        ...RisiBank.Defaults.Overlay.Dark,

        /**
         * What to do when a media is selected
         */
        onSelectMedia: ({ id, media }) => console.log('selected', id, media),
    });
    ```

## Useful links

-   A jsfiddle with a [simple demo in overlay mode](https://jsfiddle.net/7wqLj9x1/2/).
-   Another jsfiddle with a [complex demo in iframe mode](https://jsfiddle.net/khr9pvae/1/).
-   For API Reference, check [RisiBank.activate options](https://github.com/RisiBank/risibank-web-api/blob/master/src/RisiBank.js#L7).

## Used by

-   [RisiBank userscript collection](https://github.com/RisiBank/risibank-userscripts)
-   [RisiBank chrome extension](https://github.com/RisiBank/risibank-chrome-extension)
-   [RisiBank flutter application](https://github.com/RisiBank/risibank-flutter)

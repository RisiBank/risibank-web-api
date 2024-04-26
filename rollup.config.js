import esbuild, { minify } from 'rollup-plugin-esbuild';

const name = 'risibank';

const bundle = (config) => ({
    ...config,
    input: 'src/web.ts',
    external: (id) => !/^[./]/.test(id),
});

export default [
    bundle({
        plugins: [esbuild(), minify()],
        output: [
            {
                file: `dist/${name}.min.js`,
                name: 'window',
                extend: true,
                format: 'iife',
            },
        ],
    }),
];

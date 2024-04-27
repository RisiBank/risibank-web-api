import esbuild, { minify } from 'rollup-plugin-esbuild';

const name = 'risibank';

const bundle = (config) => ({
    plugins: [esbuild(), minify()],
    input: 'src/web.ts',
    external: (id) => !/^[./]/.test(id),
    ...config,
});

export default [
    bundle({
        output: [
            {
                file: `dist/${name}.min.js`,
                name: 'window',
                extend: true,
                format: 'iife',
                globals: {
                    RisiBank: 'RisiBank',
                }
            },
        ],
    }),
    bundle({
        output: [
            {
                file: `dist/${name}.cjs`,
                format: 'cjs',
            },
        ],
    }),
];

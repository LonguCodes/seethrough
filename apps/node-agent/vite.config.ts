import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
    // ...vite configures
    build: {
        ssr: true,
        outDir: './dist'
    },
    plugins: [
        ...VitePluginNode({
            adapter: 'nest',
            appPath: './src/main.ts',
            exportName: 'viteNodeApp',
            tsCompiler: 'swc',
            outputFormat: 'esm',
            swcOptions: {
                minify: false
            },
            initAppOnBoot: true
        })
    ],
    optimizeDeps: {
        // Vite does not work well with optionnal dependencies,
        // mark them as ignored for now
        exclude: [
            '@nestjs/microservices',
            '@nestjs/websockets',
            'cache-manager',
            'class-transformer',
            'class-validator',
            'fastify-swagger',
        ],
    },
});
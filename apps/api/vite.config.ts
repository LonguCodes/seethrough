import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
export default defineConfig({
    // ...vite configures
    server: {
        port: 3000
    },
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
            initAppOnBoot: true,
            swcOptions: {
                minify: false
            }
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
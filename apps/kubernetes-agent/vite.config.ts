import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
export default defineConfig({
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

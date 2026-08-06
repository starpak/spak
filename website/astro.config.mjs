// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  site: 'https://spak.dev',
  // 岛屿架构：Vue 集成（仅用于岛屿组件，不启用客户端路由，保持多页面导航）
  integrations: [vue()],
  server: {
    host: true,
    port: 4321,
  },
  output: 'static',
  trailingSlash: 'ignore',
});

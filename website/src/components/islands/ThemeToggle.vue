<script setup lang="ts">
/**
 * 岛屿 1：ThemeToggle
 * 水合策略：client:load（首屏立即水合，避免主题切换延迟与 FOUC）
 */
import { ref, onMounted } from 'vue';
type Theme = 'light' | 'dark';
const theme = ref<Theme>('light');
const mounted = ref(false);
const apply = (t: Theme) => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('spak-theme', t); theme.value = t; };
const toggle = () => apply(theme.value === 'light' ? 'dark' : 'light');
onMounted(() => { theme.value = (document.documentElement.getAttribute('data-theme') as Theme) || 'light'; mounted.value = true; });
</script>
<template>
  <button class="theme-toggle" :class="{ 'is-dark': theme === 'dark' }" @click="toggle" :aria-label="`切换到${theme === 'light' ? '深色' : '浅色'}模式`" :title="`切换到${theme === 'light' ? '深色' : '浅色'}模式`">
    <span v-if="!mounted" class="icon-placeholder" aria-hidden="true">○</span>
    <svg v-else-if="theme === 'light'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
    <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
  </button>
</template>
<style scoped>
.theme-toggle { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: var(--radius-sm); background: transparent; border: 1px solid var(--border); color: var(--text-soft); cursor: pointer; transition: all .18s ease; }
.theme-toggle:hover { color: var(--brand-600); border-color: var(--brand-500); background: var(--brand-50); }
[data-theme='dark'] .theme-toggle:hover { background: rgba(139,92,246,.12); }
.icon, .icon-placeholder { width: 18px; height: 18px; display: block; }
.icon-placeholder { font-size: 14px; line-height: 18px; text-align: center; color: var(--text-muted); }
</style>

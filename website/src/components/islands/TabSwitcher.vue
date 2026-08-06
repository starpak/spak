<script setup lang="ts">
/**
 * 岛屿 8：TabSwitcher
 * 水合策略：client:idle
 */
import { ref } from 'vue';
interface Tab { id: string; label: string; code: string }
const props = defineProps<{ tabs: Tab[] }>();
const active = ref(props.tabs[0]?.id ?? '');
</script>
<template>
  <div class="tab-switcher">
    <div class="tab-bar" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" :class="['tab', { active: active === tab.id }]" role="tab" :aria-selected="active === tab.id" @click="active = tab.id">{{ tab.label }}</button>
    </div>
    <div class="tab-panels">
      <div v-for="tab in tabs" v-show="active === tab.id" :key="tab.id" class="tab-panel" role="tabpanel"><pre><code>{{ tab.code }}</code></pre></div>
    </div>
    <p class="tab-hint">↑ 切换包管理器，<code>client:idle</code> 空闲水合示例</p>
  </div>
</template>
<style scoped>
.tab-switcher { margin: 1.5rem 0; }
.tab-bar { display: inline-flex; gap: .25rem; padding: .25rem; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: -1px; position: relative; z-index: 1; }
.tab { padding: .4em 1em; font-family: var(--font-mono); font-size: .82rem; background: transparent; border: none; border-radius: 6px; color: var(--text-soft); cursor: pointer; transition: all .15s ease; }
.tab:hover { color: var(--text); }
.tab.active { background: var(--bg-elevated); color: var(--brand-600); box-shadow: var(--shadow-sm); }
[data-theme='dark'] .tab.active { color: var(--brand-300); }
.tab-panel pre { border-radius: 0 var(--radius-sm) var(--radius-sm) var(--radius-sm); margin: 0; }
.tab-hint { font-size: .78rem; color: var(--text-muted); margin: .6rem 0 0; }
</style>

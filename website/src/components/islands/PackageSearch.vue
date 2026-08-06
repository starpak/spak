<script setup lang="ts">
/**
 * 岛屿 3：PackageSearch
 * 水合策略：client:load（搜索是核心交互）
 */
import { ref, computed } from 'vue';
interface PkgInfo { name: string; npm: string; emoji: string; desc: string; role: string; version: string; status: 'stable' | 'beta' | 'alpha'; deps: string[]; exports: string[] }
const props = defineProps<{ packages: PkgInfo[] }>();
const query = ref('');
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.packages;
  return props.packages.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.npm.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.role.toLowerCase().includes(q) ||
    p.exports.some((e) => e.toLowerCase().includes(q))
  );
});
</script>
<template>
  <div class="pkg-search">
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
      <input v-model="query" type="search" placeholder="搜索包名、用途、导出 API…" aria-label="搜索包" />
      <span class="count">{{ filtered.length }} / {{ packages.length }}</span>
    </div>
    <transition-group tag="div" name="list" class="pkg-grid">
      <div v-for="pkg in filtered" :key="pkg.name" class="card pkg-card">
        <div class="pkg-head">
          <span class="pkg-emoji" aria-hidden="true">{{ pkg.emoji }}</span>
          <div class="pkg-info">
            <h3 class="pkg-name">{{ pkg.name }}</h3>
            <span class="pkg-role">{{ pkg.role }}</span>
          </div>
          <div class="pkg-badges">
            <span class="pkg-ver">{{ pkg.version }}</span>
            <span :class="['status', `status-${pkg.status}`]">{{ pkg.status }}</span>
          </div>
        </div>
        <p class="pkg-desc">{{ pkg.desc }}</p>
        <div class="pkg-exports">
          <span class="exports-label">导出</span>
          <code v-for="e in pkg.exports" :key="e" class="export-tag">{{ e }}</code>
        </div>
      </div>
    </transition-group>
    <p v-if="filtered.length === 0" class="empty">没找到匹配的包喵～试试别的关键词？</p>
  </div>
</template>
<style scoped>
.search-bar { position: relative; max-width: 560px; margin: 0 auto 2rem; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-muted); pointer-events: none; }
.search-bar input { width: 100%; padding: .8em 4.5em .8em 2.8em; font-size: .95rem; font-family: inherit; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 999px; color: var(--text); transition: border-color .18s ease, box-shadow .18s ease; }
.search-bar input:focus { outline: none; border-color: var(--brand-500); box-shadow: 0 0 0 3px var(--brand-50); }
[data-theme='dark'] .search-bar input:focus { box-shadow: 0 0 0 3px rgba(139,92,246,.18); }
.count { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-family: var(--font-mono); font-size: .8rem; color: var(--text-muted); }
.pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.pkg-card { display: block; text-decoration: none; color: inherit; }
.pkg-head { display: flex; align-items: flex-start; gap: .85rem; margin-bottom: .6rem; }
.pkg-emoji { font-size: 1.8rem; line-height: 1; }
.pkg-info { flex: 1; }
.pkg-name { font-family: var(--font-mono); font-size: 1rem; margin: 0 0 .1em; color: var(--text); }
.pkg-role { font-size: .75rem; color: var(--brand-600); font-weight: 600; }
[data-theme='dark'] .pkg-role { color: var(--brand-300); }
.pkg-badges { display: flex; flex-direction: column; gap: .3rem; align-items: flex-end; }
.pkg-ver { font-family: var(--font-mono); font-size: .72rem; color: var(--text-muted); }
.pkg-desc { font-size: .88rem; color: var(--text-soft); margin: 0 0 .75rem; }
.pkg-exports { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; padding-top: .5rem; border-top: 1px dashed var(--border); }
.exports-label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-right: .25rem; }
.export-tag { font-size: .7rem; padding: .15em .5em; }
.empty { text-align: center; color: var(--text-muted); padding: 2rem; }
.list-move, .list-enter-active, .list-leave-active { transition: all .3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(.95); }
.list-leave-active { position: absolute; }
</style>

<script setup lang="ts">
/**
 * 岛屿 2：MobileNav
 * 水合策略：client:load（桌面端 display:none 会导致 visible 不触发）
 */
import { ref } from 'vue';
interface NavItem { label: string; href: string; desc?: string }
const props = defineProps<{ items: NavItem[]; currentPath: string }>();
const open = ref(false);
const toggle = () => (open.value = !open.value);
const close = () => (open.value = false);
const isActive = (href: string) => href === '/' ? props.currentPath === '/' : props.currentPath.startsWith(href);
</script>
<template>
  <div class="mobile-nav">
    <button class="hamburger" :class="{ open }" @click="toggle" aria-label="切换菜单" :aria-expanded="open">
      <span></span><span></span><span></span>
    </button>
    <transition name="drawer">
      <nav v-if="open" class="drawer" aria-label="移动端导航">
        <a v-for="item in items" :key="item.href" :href="item.href" :class="['drawer-link', { active: isActive(item.href) }]" :title="item.desc" @click="close">{{ item.label }}</a>
      </nav>
    </transition>
    <transition name="fade"><div v-if="open" class="backdrop" @click="close" /></transition>
  </div>
</template>
<style scoped>
.mobile-nav { position: relative; display: none; }
@media (max-width: 768px) { .mobile-nav { display: block; } }
.hamburger { display: inline-flex; flex-direction: column; justify-content: center; gap: 5px; width: 36px; height: 36px; padding: 0 8px; background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; }
.hamburger span { display: block; width: 100%; height: 2px; background: var(--text-soft); border-radius: 2px; transition: transform .25s ease, opacity .2s ease; }
.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.open span:nth-child(2) { opacity: 0; }
.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.drawer { position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg); padding: .5rem; z-index: 200; }
.drawer-link { display: block; padding: .65em .9em; border-radius: var(--radius-sm); color: var(--text-soft) !important; font-weight: 500; }
.drawer-link:hover { background: var(--bg-soft); color: var(--text) !important; }
.drawer-link.active { color: var(--brand-600) !important; background: var(--brand-50); }
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 150; }
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s ease, transform .2s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; transform: translateY(-6px); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

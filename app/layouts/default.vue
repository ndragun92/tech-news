<template>
  <main class="flex h-dvh w-full flex-col overflow-hidden p-4 gap-4">
    <header class="bg-zinc-900/75 rounded-lg border-dashed border border-zinc-800/75 z-10">
      <h1>Nuxt 3 Starter</h1>
      <nav>
        <ul>
          <li><NuxtLink to="/">Home</NuxtLink></li>
          <li><NuxtLink to="/about">About</NuxtLink></li>
        </ul>
      </nav>
    </header>
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <aside class="w-75 bg-zinc-900/75 rounded-lg border-dashed border border-zinc-800/75 z-10">
        <button type="button" @click="refresh">Refetch news</button>
        <pre>
          {{ news }}
        </pre>
      </aside>
      <div class="min-h-0 min-w-0 flex-1 overflow-hidden relative">
        <slot />
      </div>
    </div>
  </main>
</template>

<script lang="ts" setup>
const { data: news, refresh } = await useFetch("/api/news/tech", {
  method: "GET",
});
</script>

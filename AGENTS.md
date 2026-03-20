# 🧠 Nuxt 4 Agent Guidelines

This document defines coding standards and best practices for building scalable, maintainable applications using **Nuxt 4** and **Tailwind CSS v4**.

---

## ⚙️ Core Principles

- Use **Composition API only**
- Prefer **arrow functions** for all functions
- Keep components **small and focused**
- Use **auto-imports** provided by Nuxt
- Favor **server routes (Nitro)** over external APIs when possible
- Avoid unnecessary abstraction

---

## 📁 Project Structure

```
/components        → Reusable UI components
/pages             → File-based routing
/layouts           → Layout wrappers
/composables       → Reusable logic (useX pattern)
/server/api        → Backend API routes (Nitro)
/plugins           → App plugins
/middleware        → Route middleware
/assets            → Static assets (CSS, images)
/public            → Public static files
```

---

## 🧩 Components

### ✅ Rules

- Use `<script setup>`
- Use **arrow functions**
- Keep logic minimal
- Extract reusable logic into composables

### ✅ Example

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string;
}>();

const handleClick = () => {
  console.log("Clicked");
};
</script>

<template>
  <div class="p-4">
    <h1 class="text-xl font-bold">{{ props.title }}</h1>
    <button @click="handleClick" class="btn-primary">Click</button>
  </div>
</template>
```

---

## 🪝 Composables

### ✅ Rules

- Always prefix with `use`
- Use arrow functions
- Keep them pure and reusable

### ✅ Example

```ts
export const useCounter = () => {
  const count = useState<number>("count", () => 0);

  const increment = () => count.value++;
  const decrement = () => count.value--;

  return {
    count,
    increment,
    decrement,
  };
};
```

---

## 🌐 Data Fetching

### ✅ Use `useFetch` or `useAsyncData`

- SSR-friendly
- Built-in caching
- Typed support

```ts
const { data, pending, error } = await useFetch("/api/users");
```

### ✅ With Params

```ts
const { data } = await useFetch(() => `/api/users/${userId.value}`);
```

---

## 🧠 State Management

- Use `useState` for global state
- Avoid external libraries unless necessary

```ts
const user = useState("user", () => null);
```

---

## 🔌 Server API (Nitro)

### ✅ Rules

- Use arrow functions
- Validate input
- Keep handlers clean

### ✅ Example

```ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  return {
    message: "Success",
    data: body,
  };
});
```

---

## 🎨 Tailwind CSS v4

### ✅ Rules

- Utility-first approach
- Avoid inline styles
- Extract repeated patterns into components

### ✅ Example

```html
<button class="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition">
  Save
</button>
```

### ✅ Reusable Classes (via components)

```vue
<template>
  <button class="btn-primary">
    <slot />
  </button>
</template>
```

---

## 🧭 Routing

- File-based routing
- Use dynamic routes `[id].vue`

```bash
/pages/users/[id].vue
```

---

## 🛡 Middleware

```ts
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState("user");

  if (!user.value) {
    return navigateTo("/login");
  }
});
```

---

## 🔌 Plugins

```ts
export default defineNuxtPlugin(() => {
  return {
    provide: {
      hello: () => "Hello world",
    },
  };
});
```

Usage:

```ts
const { $hello } = useNuxtApp();
```

---

## ⚡ Performance

- Use `<NuxtImg>` for optimized images
- Lazy load components when needed
- Avoid unnecessary watchers
- Prefer computed over watch when possible

---

## 🧪 Testing

- ❌ Do NOT include unit tests
- ❌ Do NOT include E2E tests

---

## 🧼 Code Style

- Use **TypeScript**
- Prefer `const` over `let`
- Use arrow functions everywhere
- Keep functions small and pure
- Avoid deeply nested logic

---

## 🚀 Deployment

- Use Nitro presets (Node, Edge, Serverless)
- Optimize environment variables
- Enable caching where possible

---

## ✅ Summary

- Composition API + Arrow Functions only
- Tailwind v4 for styling
- Built-in Nuxt features over external libs
- Clean, modular, scalable structure

---

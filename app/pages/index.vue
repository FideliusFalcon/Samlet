<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo('/board', { replace: true }),
})
</script>

<template>
  <div class="app-header">
    <div class="logo">
      <h1>Drone Mission Planner</h1>
    </div>
    <div class="nav-links">
      <v-btn variant="text">Dashboard</v-btn>
      <v-btn variant="text">Missions</v-btn>
      <v-btn variant="text">Settings</v-btn>
    </div>
  </div>
</template>

<script setup>
// Header component
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid var(--border-color);
}

.logo h1 {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--primary-color);
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 10px;
}
</style> 
<template>
  <button class="fab-record" @click="$emit('click')">
    <img class="fab-icon" src="/Voice.svg" alt="Record" width="29" height="29" />
  </button>
</template>

<script setup>
defineEmits(['click'])
</script>

<style scoped>
/* Floating Action Button */
.fab-record {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF4775, #E63946);
  border: none;
  box-shadow: 
    0 4px 20px rgba(255, 71, 117, 0.4),
    0 8px 30px rgba(255, 71, 117, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000; /* Z-index élevé pour être au-dessus de tout */
  padding: 0; /* Supprimer tout padding */
}

.fab-icon {
  width: 29px;
  height: 29px;
  filter: brightness(0) invert(1); /* Rend l'icône blanche */
  display: block; /* Assurer que l'icône se comporte comme un bloc */
  margin: 0; /* Supprimer toute marge */
  flex-shrink: 0; /* Empêcher la réduction de taille */
}

/* Responsive pour mobile */
@media (max-width: 640px) {
  .fab-record {
    position: fixed;
    bottom: 4%;
    left: 50%;
    transform: translateX(-50%);
    right: auto;
    top: auto;
    margin: 0;
    justify-content: center;
    align-items: center;
  }
}

@media (max-width: 640px) {
  .fab-icon {
    margin: 0;
  }
}

@media (max-width: 480px) {
  .fab-record {
    width: 56px;
    height: 56px;
  }

  .fab-icon {
    width: 26px;
    height: 26px;
  }
}
</style>

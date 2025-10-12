<template>
  <div class="header-tabs-container">
    <div class="tabs-wrapper">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="handleTabClick(tab)"
        class="tab-button"
        :class="activeTab === tab ? 'tab-active' : 'tab-inactive'"
        :aria-pressed="activeTab === tab"
      >
        {{ tab }}
      </button>

      <!-- Volet animé style TikTok -->
      <div
        class="active-indicator"
        :style="{ width: `${tabWidth}px`, transform: `translateX(${tabOffset}px)` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";

const tabs = ["Mon village", "Radio", "Podcast"];
const activeTab = ref("Mon village");

const tabWidth = ref(0);
const tabOffset = ref(0);

const updateBarPosition = () => {
  const buttons = document.querySelectorAll(".tab-button");
  const activeBtn = Array.from(buttons).find(btn => btn.textContent.trim() === activeTab.value);
  
  // Debug: afficher les positions de tous les boutons
  console.log('🔍 Positions des boutons:');
  buttons.forEach((btn, index) => {
    console.log(`  ${index}: "${btn.textContent.trim()}" - offsetLeft: ${btn.offsetLeft}px, width: ${btn.offsetWidth}px`);
  });
  
  if (activeBtn) {
    tabWidth.value = activeBtn.offsetWidth;
    tabOffset.value = activeBtn.offsetLeft;
    
    console.log(`🎯 Tab "${activeTab.value}": width=${tabWidth.value}px, offset=${tabOffset.value}px`);
  } else {
    console.warn(`⚠️ Bouton actif non trouvé pour l'onglet: ${activeTab.value}`);
  }
};

const handleTabClick = (tab) => {
  console.log(`🖱️ Clic sur l'onglet: ${tab}`);
  activeTab.value = tab;
  // Émettre un événement pour informer le parent du changement d'onglet
  emit('tab-change', tab);
};

// Émettre l'événement pour la communication avec le parent
const emit = defineEmits(['tab-change']);

onMounted(() => {
  nextTick(updateBarPosition);
});

watch(activeTab, () => {
  nextTick(updateBarPosition);
});

// Exposer l'onglet actif pour permettre au parent de le contrôler
defineExpose({
  activeTab,
  setActiveTab: (tab) => {
    activeTab.value = tab;
  }
});
</script>

<style scoped>
/* Container principal */
.header-tabs-container {
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0;
  position: relative;
}

/* Wrapper des onglets */
.tabs-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  max-width: 400px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Boutons des onglets */
.tab-button {
  flex: 1;
  padding: 0.875rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  min-width: 0;
  text-align: center;
}

/* Onglet actif */
.tab-active {
  color: #F1EDE1;
  font-weight: 700;
}

/* Onglet inactif */
.tab-inactive {
  color: rgba(241, 237, 225, 0.6);
  font-weight: 500;
}

.tab-inactive:hover {
  color: rgba(241, 237, 225, 0.8);
}

/* Animation de clic */
.tab-button:active {
  transform: scale(0.98);
}

/* Indicateur actif style TikTok */
.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #FF4775, #F10F47);
  border-radius: 2px 2px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  box-shadow: 0 2px 8px rgba(255, 71, 117, 0.3);
}

/* Responsive design */
@media (max-width: 480px) {
  .tabs-wrapper {
    padding: 0 0.5rem;
  }
  
  .tab-button {
    padding: 0.75rem 0;
    font-size: 0.8rem;
  }
  
  .active-indicator {
    height: 2.5px;
  }
}

/* Animation d'entrée */
.header-tabs-container {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

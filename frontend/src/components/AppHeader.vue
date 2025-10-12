<template>
  <header class="header">
    <div class="header-content">
      <!-- Left: Gift Icon -->
      <div 
        class="gift-icon-container" 
        @click="openSupportModal"
        title="Soutenir le projet"
        @mouseenter="showTooltip = true; tooltipText = 'Soutenir le projet'; tooltipPosition = { left: '10px', top: '50px' }"
        @mouseleave="showTooltip = false"
      >
        <img src="/gift.svg" alt="Soutenir le projet" class="gift-icon" />
      </div>
      
      <!-- Center: Title and Time -->
      <div class="header-center">
        <div class="time-remaining">
          <span>Expire dans</span>
          <span class="time-dot">•</span>
          <span class="time-value">{{ formattedTimeRemaining }}</span>
        </div>
      </div>
      
      <!-- Right: Warning Icon -->
      <div 
        class="warning-icon-container" 
        @click="openReportModal"
        title="Signaler un problème"
        @mouseenter="showTooltip = true; tooltipText = 'Signaler un problème'; tooltipPosition = { right: '10px', top: '50px' }"
        @mouseleave="showTooltip = false"
      >
        <img src="/alert.svg" alt="Signaler un problème" class="warning-icon" />
      </div>
    </div>
    
    <!-- Header Tabs Navigation -->
    <HeaderTabs 
      @tab-change="handleTabChange"
      ref="headerTabsRef"
    />
  </header>

  <!-- Support Modal -->
  <SupportModal 
    :is-visible="showSupportModal" 
    @close="closeSupportModal"
    @support="handleSupport"
  />

  <!-- Report Modal -->
  <ReportModal 
    :is-visible="showReportModal" 
    @close="closeReportModal"
    @report="handleReport"
  />

  <!-- Tooltip System -->
  <TooltipSystem 
    v-if="showTooltip" 
    :text="tooltipText" 
    :position="tooltipPosition" 
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SupportModal from './SupportModal.vue'
import ReportModal from './ReportModal.vue'
import TooltipSystem from './TooltipSystem.vue'
import HeaderTabs from './HeaderTabs.vue'

// Modal state
const showSupportModal = ref(false)
const showReportModal = ref(false)

// Tooltip state
const showTooltip = ref(false)
const tooltipText = ref('')
const tooltipPosition = ref({})

// Header Tabs state
const headerTabsRef = ref(null)
const currentTab = ref('Radio')

// Time remaining state
const timeRemaining = ref(0)
let timeInterval = null

// Methods
function openSupportModal() {
  showSupportModal.value = true
}

function closeSupportModal() {
  showSupportModal.value = false
}

function openReportModal() {
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
}

function handleSupport() {
  // Logique pour traiter le soutien de 5000 XAF
  console.log('Soutien de 5000 XAF demandé')
  // Ici on pourrait intégrer un système de paiement
  closeSupportModal()
}

function handleReport(reportData) {
  // Logique pour traiter le signalement
  console.log('Signalement reçu:', reportData)
  // Ici on pourrait envoyer le signalement à la base de données
  closeReportModal()
}

function handleTabChange(tab) {
  currentTab.value = tab
  console.log('Onglet actif:', tab)
  // Émettre un événement pour informer le composant parent du changement d'onglet
  emit('tab-change', tab)
}

// Émettre l'événement pour la communication avec le parent
const emit = defineEmits(['tab-change'])

// Time remaining functions
function calculateTimeRemaining() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0) // Minuit du lendemain
  
  const diff = tomorrow.getTime() - now.getTime()
  timeRemaining.value = Math.max(0, Math.floor(diff / 1000)) // En secondes
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Computed property for formatted time
const formattedTimeRemaining = computed(() => {
  return formatTime(timeRemaining.value)
})

// Lifecycle hooks
onMounted(() => {
  calculateTimeRemaining()
  timeInterval = setInterval(() => {
    calculateTimeRemaining()
  }, 1000) // Mise à jour chaque seconde
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
/* Header */
.header {
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 100;
}

.header-content {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.gift-icon-container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: #FF4775;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 71, 117, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.gift-icon-container:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 71, 117, 0.4);
}

.gift-icon-container:active {
  transform: scale(0.95);
}

.gift-icon {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}

.header-center {
  flex-grow: 1;
  text-align: center;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: #F1EDE1;
}

.time-remaining {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #F1EDE1;
  font-weight: 400;
}

.time-dot {
  margin: 0 0.25rem;
  color: #F1EDE1;
}

.time-value {
  color: #FF4775;
  font-weight: 600;
}

.warning-icon-container {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 2px solid #F1EDE1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.warning-icon {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}
</style>

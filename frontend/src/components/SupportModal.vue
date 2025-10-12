<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <div class="gift-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12V22H4V12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 7H22V12H2V7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 22V7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 class="modal-title">Soutenir Eclairia</h2>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <p class="support-text">
          Eclairia est une startup passionnée qui s'efforce de porter les voix africaines au sommet grâce à la technologie de l'information depuis 2018.
        </p>
        <p class="support-text">
          Nous sommes constitués d'une équipe de visionnaires, de créatifs, d'ingénieurs... de passionnés d'idées innovantes.
        </p>
        <p class="support-text">
          Nous avons besoin de votre soutien pour agrandir notre équipe et déployer une version plus complète de l'application.
        </p>
      </div>

      <!-- Call to Action -->
      <div class="modal-cta">
        <p class="cta-text">Soutenez notre projet avec un don de <strong>5 000 FCFA</strong></p>
        <button class="cta-button" @click="handleSupport">
          Soutenir le projet
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'support'])

function closeModal() {
  emit('close')
}

function handleSupport() {
  // Rediriger vers la page de donation Flutterwave
  window.open('https://flutterwave.com/donate/l3jynwxachdx', '_blank')
  
  emit('support')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: #0A1B5A;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.gift-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.modal-body {
  margin-bottom: 24px;
}

.support-text {
  color: #E1E5E9;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
  font-weight: 400;
}

.modal-cta {
  text-align: center;
}

.cta-text {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.cta-button {
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s ease;
}

.cta-button:hover {
  background: #0056CC;
}

.cta-button:active {
  background: #004499;
}

/* Responsive */
@media (max-width: 480px) {
  .modal-content {
    padding: 20px;
    margin: 20px;
  }
  
  .modal-title {
    font-size: 20px;
  }
  
  .support-text {
    font-size: 13px;
  }
  
  .cta-text {
    font-size: 15px;
  }
  
  .cta-button {
    padding: 14px 24px;
    font-size: 15px;
  }
}
</style> 
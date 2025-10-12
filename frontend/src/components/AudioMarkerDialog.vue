<template>
  <div v-if="show" class="dialog-overlay" @click="handleBackdropClick">
    <div class="dialog-content" @click.stop>
      <!-- Dialog for own audio -->
      <div v-if="isOwnAudio" class="dialog-section">
        <div class="dialog-header">
          <h3>Votre note vocale</h3>
          <p>{{ audioData.title }}</p>
        </div>
        
        <div class="dialog-actions">
          <button 
            class="action-btn delete-btn" 
            @click="handleDelete"
            :disabled="isDeleting"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            {{ isDeleting ? 'Suppression...' : 'Supprimer' }}
          </button>
          
          <button class="action-btn cancel-btn" @click="handleCancel">
            Annuler
          </button>
        </div>
      </div>
      
      <!-- Dialog for other user's audio -->
      <div v-else class="dialog-section">
        <div class="dialog-header">
          <h3>Note vocale</h3>
          <p>{{ audioData.title }}</p>
          <span class="audio-user">Par {{ audioData.user }}</span>
        </div>
        
        <div class="dialog-actions">
          <button 
            class="action-btn report-btn" 
            @click="handleReport"
            :disabled="isReporting"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            {{ isReporting ? 'Signalement...' : 'Signaler' }}
          </button>
          
          <button class="action-btn cancel-btn" @click="handleCancel">
            Annuler
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  audioData: {
    type: Object,
    default: () => ({})
  },
  currentUserId: {
    type: String,
    default: 'current-user' // Default user ID
  }
})

const emit = defineEmits(['close', 'delete', 'report'])

// State
const isDeleting = ref(false)
const isReporting = ref(false)

// Computed
const isOwnAudio = computed(() => {
  return props.audioData.userId === props.currentUserId || 
         props.audioData.user === 'Éclaireur' || 
         props.audioData.user === 'Utilisateur'
})

// Methods
const handleDelete = async () => {
  if (isDeleting.value) return
  
  isDeleting.value = true
  
  try {
    await emit('delete', props.audioData)
  } catch (error) {
    console.error('Error deleting audio:', error)
  } finally {
    isDeleting.value = false
  }
}

const handleReport = async () => {
  if (isReporting.value) return
  
  isReporting.value = true
  
  try {
    await emit('report', props.audioData)
  } catch (error) {
    console.error('Error reporting audio:', error)
  } finally {
    isReporting.value = false
  }
}

const handleCancel = () => {
  emit('close')
}

const handleBackdropClick = () => {
  emit('close')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
}

.dialog-content {
  background: linear-gradient(135deg, #1a2b5c 0%, #2d4a8a 100%);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  width: 90%;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-header {
  text-align: center;
}

.dialog-header h3 {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.dialog-header p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.audio-user {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-style: italic;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 48px;
}

.delete-btn {
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  color: white;
  box-shadow: 0 4px 20px rgba(255, 71, 87, 0.3);
}

.delete-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff5722 0%, #ff1744 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255, 71, 87, 0.4);
}

.report-btn {
  background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%);
  color: white;
  box-shadow: 0 4px 20px rgba(255, 167, 38, 0.3);
}

.report-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffb74d 0%, #ff8f00 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255, 167, 38, 0.4);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.action-btn svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.delete-btn svg {
  fill: none;
}

.report-btn svg {
  fill: currentColor;
  stroke: none;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .dialog-content {
    padding: 20px;
    max-width: 300px;
  }
  
  .dialog-header h3 {
    font-size: 16px;
  }
  
  .action-btn {
    padding: 10px 16px;
    font-size: 13px;
    min-height: 44px;
  }
}
</style>

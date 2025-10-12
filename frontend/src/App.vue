<script setup>
import { ref, onMounted } from 'vue'
import SplashScreen from './components/SplashScreen.vue'
import VoiceCommentRecorder from './components/VoiceCommentRecorder.vue'

// Application state management
const currentView = ref('splash')
const showRecordModal = ref(false)

// Initialize app with splash screen timeout
onMounted(() => {
  setTimeout(() => {
    currentView.value = 'home'
  }, 10000)
})

function openRecordModal() {
  showRecordModal.value = true
}

function closeRecordModal() {
  showRecordModal.value = false
}


</script>

<template>
  <div id="app">
    <router-view @open-record="openRecordModal" />
    
    <!-- SplashScreen -->
    <SplashScreen v-if="currentView === 'splash'" />
    
    <!-- Record Modal -->
    <VoiceCommentRecorder 
      v-if="showRecordModal"
      @close="closeRecordModal"
      @comment-sent="closeRecordModal"
    />
    
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  position: relative;
}


/* Prevent body scroll when modal is open */
body.modal-open {
  overflow: hidden;
}

/* Eliminate white space between splash and home */
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #09174C 0%, #1a2b5c 50%, #2d4a8a 100%);
}

/* Ensure no gap between components */
.splash-screen,
.home-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(9, 23, 76, 0.1);
}

::-webkit-scrollbar-thumb {
  background: #FF4775;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #09174C;
}
</style>

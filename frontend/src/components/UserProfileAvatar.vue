<template>
  <div class="user-profile-avatar" :style="{ left: position.x + 'px', top: position.y + 'px' }" @click="handleClick">
    <!-- Effets de blur en arrière-plan (bleu et dégradé) -->
    <div class="background-effects">
      <!-- Grand effet blur bleu -->
      <div class="blur-effect-blue"></div>
      <!-- Effet blur dégradé -->
      <div class="blur-effect-gradient"></div>
    </div>
    
    <!-- Cercles d'effets avec opacités -->
    <div class="effect-circles">
      <div class="effect-circle-outer"></div>
      <div class="effect-circle-inner"></div>
    </div>
    
    <!-- Profil utilisateur principal -->
    <div class="user-profile">
      <div class="profile-container">
        <div class="profile-image-wrapper">
          <img 
            :src="userProfileImage" 
            alt="Profil utilisateur"
            class="profile-image"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 25, y: 22 })
  },
  userProfileImage: {
    type: String,
    default: '/profile/default.png'
  }
})

// Emits
const emit = defineEmits(['click'])

// Reactive properties
const isHovered = ref(false)

// Gérer le clic sur le profil utilisateur
const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.user-profile-avatar {
  position: absolute;
  width: 121px;
  height: 147px;
  flex-shrink: 0;
  z-index: 1000;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.user-profile-avatar:hover {
  transform: scale(1.05);
}

/* Effets de blur en arrière-plan */
.background-effects {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.blur-effect-blue {
  position: absolute;
  left: 0px;
  top: 27px;
  width: 121px;
  height: 121px;
  background: linear-gradient(146deg, #0F69F1 0%, #FF80CC 134.83%);
  border-radius: 50%;
  filter: blur(18.094881057739258px);
  flex-shrink: 0;
}

.blur-effect-gradient {
  position: absolute;
  left: 25px;
  top: 36px;
  width: 62px;
  height: 62px;
  background: linear-gradient(324deg, #8A30E3 1.35%, #EE6BA1 56.42%, #EAC893 96.38%);
  border-radius: 50%;
  filter: blur(18.094881057739258px);
  flex-shrink: 0;
}

/* Cercles d'effets avec opacités */
.effect-circles {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.effect-circle-outer {
  position: absolute;
  left: 2px;
  top: 0px;
  width: 118px;
  height: 118px;
  background: rgba(4, 59, 248, 0.16);
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulseOuter 3s ease-in-out infinite;
}

.effect-circle-inner {
  position: absolute;
  left: 8px;
  top: 6px;
  width: 106px;
  height: 106px;
  background: rgba(4, 59, 248, 0.16);
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulseInner 3s ease-in-out infinite 0.5s;
}

/* Profil utilisateur principal */
.user-profile {
  position: absolute;
  left: 25px;
  top: 22px;
  width: 72px;
  height: 94px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4.825px;
}

.profile-container {
  display: flex;
  padding: 3.619px;
  justify-content: center;
  align-items: center;
  gap: 12.063px;
  border-radius: 36.19px;
  position: relative;
}

.profile-image-wrapper {
  width: 65.142px;
  height: 65.142px;
  position: relative;
}

.profile-image {
  width: 65px;
  height: 65px;
  border-radius: 120.633px;
  border: 2.413px solid #F10F47;
  flex-shrink: 0;
  object-fit: cover;
  transition: all 0.3s ease;
}

.profile-image:hover {
  border-color: #FF4775;
  box-shadow: 0 0 20px rgba(241, 15, 71, 0.4);
}

/* Animations */
@keyframes pulseOuter {
  0%, 100% {
    opacity: 0.16;
    transform: scale(1);
  }
  50% {
    opacity: 0.25;
    transform: scale(1.05);
  }
}

@keyframes pulseInner {
  0%, 100% {
    opacity: 0.16;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.08);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .user-profile-avatar {
    width: 90px;
    height: 110px;
  }
  
  .blur-effect-blue {
    width: 90px;
    height: 90px;
    filter: blur(14px);
  }
  
  .blur-effect-gradient {
    width: 46px;
    height: 46px;
    filter: blur(14px);
  }
  
  .effect-circle-outer {
    width: 88px;
    height: 88px;
  }
  
  .effect-circle-inner {
    width: 78px;
    height: 78px;
  }
  
  .user-profile {
    width: 54px;
    height: 70px;
    left: 18px;
    top: 16px;
  }
  
  .profile-image {
    width: 48px;
    height: 48px;
  }
  
  .profile-image-wrapper {
    width: 48px;
    height: 48px;
  }
}

@media (max-width: 480px) {
  .user-profile-avatar {
    width: 70px;
    height: 85px;
  }
  
  .blur-effect-blue {
    width: 70px;
    height: 70px;
    filter: blur(10px);
  }
  
  .blur-effect-gradient {
    width: 35px;
    height: 35px;
    filter: blur(10px);
  }
  
  .effect-circle-outer {
    width: 68px;
    height: 68px;
  }
  
  .effect-circle-inner {
    width: 60px;
    height: 60px;
  }
  
  .user-profile {
    width: 42px;
    height: 54px;
    left: 14px;
    top: 12px;
  }
  
  .profile-image {
    width: 36px;
    height: 36px;
  }
  
  .profile-image-wrapper {
    width: 36px;
    height: 36px;
  }
}
</style>

<template>
  <div class="helpful-container">
    <p v-if="!feedbackSent">Was this page helpful?</p>
    <div v-if="!feedbackSent" class="button-row">
      <button
        :class="{ selected: selection === 'Positive' }"
        @click="handlePositive"
        title="This page was helpful"
      >
        👍
      </button>
      <button
        :class="{ selected: selection === 'Negative' }"
        @click="handleNegative"
        title="This page was not helpful"
      >
        👎
      </button>
    </div>

    <p v-if="feedbackSent" class="thank-you">Thank you for your feedback!</p>

    <div class="feedback-section" v-if="feedbackSelected && !feedbackSent">
      <div>
        <p>Thank you for your feedback!</p>
        <p><br>Feel free to add an optional comment below.<br>Make sure not to include any personal information.</p>
      </div>
      <div class="textarea-container">
        <textarea
          ref="feedbackInput"
          v-model="feedbackText"
          :placeholder="placeholderText"
          :maxlength="charLimit"
          class="feedback-textarea"
        ></textarea>

        <p class="char-count">{{ feedbackText.length }}/140</p>
      </div>

      <div class="send-feedback">
        <button class="feedback-button" @click="sendFeedback" :disabled="!feedbackText.trim()">Send</button>
      </div>
    </div>

    <p class="more-feedback" v-if="feedbackSelected">
      More to say?
      <a href="https://github.com/capire/docs/issues" target="_blank">
        Report an issue.
      </a>
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const charLimit = 140
const feedbackText = ref('')
const feedbackSelected = ref(false)
const feedbackSent = ref(false)
const selection = ref(null)

const handlePositive = () => {
  if (selection.value === 'Positive') return
  if (typeof window !== 'undefined' && window._paq) {
    const path = new URL(window.location.href).pathname
    window._paq.push(['trackEvent', path, 'Positive'])
  }
  feedbackSelected.value = true
  selection.value = 'Positive'
}

const handleNegative = () => {
  if (selection.value === 'Negative') return
  if (typeof window !== 'undefined' && window._paq) {
    const path = new URL(window.location.href).pathname
    window._paq.push(['trackEvent', path, 'Negative'])
  }
  feedbackSelected.value = true
  selection.value = 'Negative'
}

const sendFeedback = () => {
  if (typeof window !== 'undefined' && window._paq) {
    const path = new URL(window.location.href).pathname
    const name = feedbackText.value.trim()
    window._paq.push(['trackEvent', path, selection.value, name])
    feedbackSent.value = true
  }
}

const placeholderText = computed(() => {
  if (selection.value === 'Positive') return 'What did you like about the page?'
  if (selection.value === 'Negative') return 'What did you miss on this page?'
  return ''
})
</script>

<style scoped>
.helpful-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 30px;
}

p {
  margin: 0;
}

.button-row {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  justify-content: center;
}

button {
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: none;
}

button:hover {
  border-color: var(--vp-c-brand-1);
}

button.selected {
  border-color: var(--vp-c-brand-1);
  font-weight: bold;
}

.feedback-button {
  background-color: #3b82f7;
  border: none;
  font-weight: 600;
  transition: opacity 0.2s;
  min-width: 100px;
}

.feedback-button:hover, .feedback-button.selected {
  border: none;
  opacity: 0.8;
}

.feedback-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
  gap: 0.5rem;
  margin-top: 1rem;
  position: relative;
  text-align: center;
}

.textarea-container {
  position: relative;
  width: 100%;
}

.feedback-textarea {
  font-family: var(--vp-font-family);
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  height: 90px;
  padding: 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  resize: none;
}

.char-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  padding: 0 0.3rem;
  border-radius: 3px;
}

.send-feedback {
  color: white;
  text-align: center;
}

.thank-you {
  margin-top: 1rem;
  font-size: 1rem;
  color: var(--vp-c-success);
}

.more-feedback {
  margin-top: 2rem;
  text-align: center;
}

.more-feedback a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.more-feedback a:hover {
  text-decoration: underline;
}
</style>

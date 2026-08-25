/**
 * Ephemeral toast store for short copy/download confirmations in the panel.
 */
import { create } from 'zustand'

interface ToastState {
  message: string | null
  token: number
  showToast: (message: string) => void
}

let timer: number | null = null

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  token: 0,
  showToast: (message) => {
    if (timer) window.clearTimeout(timer)
    set((state) => ({ message, token: state.token + 1 }))
    timer = window.setTimeout(() => {
      set({ message: null })
      timer = null
    }, 1800)
  },
}))

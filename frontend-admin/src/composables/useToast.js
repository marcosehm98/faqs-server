import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

export function useToast() {
  function toast(msg, type = 'success') {
    const id = ++nextId;
    toasts.value.push({ id, msg, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3500);
  }

  return { toasts, toast };
}

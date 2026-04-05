import { create } from "zustand";

type ChatState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

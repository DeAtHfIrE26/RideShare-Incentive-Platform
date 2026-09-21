/**
 * Re-export of the canonical toast store.
 *
 * This module previously held its own copy of the shadcn toast reducer, with
 * its own module-level `listeners` array and `memoryState`. Because <Toaster />
 * imported from here while use-auth, ride-card, chat-window, RealTimeTracking
 * and rides-page imported from @/hooks/use-toast, those call sites dispatched
 * into a store that nothing rendered and their toasts were never displayed.
 *
 * Keeping this path as a re-export fixes that without churning imports across
 * the tree: there is now one store, whichever specifier a file uses.
 */
export { useToast, toast } from "@/hooks/use-toast";
export type { Toast } from "@/hooks/use-toast";

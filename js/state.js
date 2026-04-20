// js/state.js - BlinkAI v3 shared mutable state

export const state = {
  toolbar:             null,   // toolbar DOM element
  outputPanel:         null,   // output panel DOM element
  outputBody:          null,   // scrollable message container
  currentSelection:    null,   // selected text string
  isProcessing:        false,  // request in-flight flag
  conversationHistory: [],     // [{role, content}] for follow-ups
  activeModelIdx:      0,      // index into MODELS array
};

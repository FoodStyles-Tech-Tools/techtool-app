/**
 * Application initialization script
 * This script initializes the Supabase client and app after DOM is ready
 */

export function generateAppInitScript(): string {
  return `
    // Track initialization to prevent multiple calls
    let isInitializing = false;
    let isInitialized = false;
    
    // Initialize Supabase client and app after DOM is ready
    function initSupabaseAndApp() {
      // Prevent multiple simultaneous initialization attempts
      if (isInitializing || isInitialized) {
        return;
      }
      
      if (typeof window.supabase !== 'undefined') {
        isInitializing = true;
        
        // Only create client if it doesn't already exist to prevent multiple instances
        if (!window.supabaseClient) {
          window.supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
          );
        }
        
        // Initialize app after Supabase is ready
        if (typeof window.initializeApp === 'function') {
          window.initializeApp();
          isInitialized = true;
          isInitializing = false;
        } else {
          // Wait for app.js to load
          isInitializing = false;
          setTimeout(initSupabaseAndApp, 100);
        }
      } else {
        setTimeout(initSupabaseAndApp, 100);
      }
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSupabaseAndApp);
    } else {
      initSupabaseAndApp();
    }
  `;
}


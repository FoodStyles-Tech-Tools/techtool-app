/**
 * Application initialization script
 * This script initializes the Supabase client and app after DOM is ready
 */

export function generateAppInitScript(): string {
  return `
    // Initialize Supabase client and app after DOM is ready
    function initSupabaseAndApp() {
      if (typeof window.supabase !== 'undefined') {
        console.log("Creating Supabase client...");
        window.supabaseClient = window.supabase.createClient(
          window.SUPABASE_URL,
          window.SUPABASE_KEY
        );
        console.log("Supabase client created successfully!");
        
        // Initialize app after Supabase is ready
        if (typeof window.initializeApp === 'function') {
          window.initializeApp();
        } else {
          // Wait for app.js to load
          setTimeout(initSupabaseAndApp, 100);
        }
      } else {
        console.log("Supabase library not ready, retrying...");
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


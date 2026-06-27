// js/supabase.js
// Supabase Client Singleton

(function () {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Supabase configuration is missing. Ensure window.SUPABASE_URL and window.SUPABASE_ANON_KEY are set in HTML <head>.");
    return;
  }

  // Check if supabase SDK is loaded from CDN
  const supabaseLib = window.supabase;
  if (!supabaseLib || typeof supabaseLib.createClient !== "function") {
    console.error("Supabase SDK is not loaded. Please load the Supabase CDN script in HTML before loading this script: <script src=\"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2\"></script>");
    return;
  }

  // Initialize and store on window.supabaseClient
  window.supabaseClient = supabaseLib.createClient(url, key);
  console.log("Supabase Client initialized successfully as window.supabaseClient.");
})();

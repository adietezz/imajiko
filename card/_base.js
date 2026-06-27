// card/_base.js
// Shared fetch and DOM population logic for all template cards

(async function () {
  // 1. Parse order ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  if (!orderId) {
    console.error("Order ID is missing in query string.");
    window.location.href = '/404.html';
    return;
  }

  // Helper to wait until Supabase client is initialized
  async function getSupabaseClient() {
    return new Promise((resolve) => {
      if (window.supabaseClient) {
        resolve(window.supabaseClient);
        return;
      }
      const interval = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(interval);
          resolve(window.supabaseClient);
        }
      }, 50);
    });
  }

  try {
    const supabase = await getSupabaseClient();
    
    // 2. Fetch order data by ID
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      console.error("Failed to fetch order or order not found:", error);
      window.location.href = '/404.html';
      return;
    }

    // 3. Expose order data globally
    window.orderData = order;

    // 4. Dispatch custom event when order data is ready
    window.dispatchEvent(new CustomEvent('orderReady', { detail: order }));

    // 5. Automatically populate DOM elements matching field IDs
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => populateDOM(order));
    } else {
      populateDOM(order);
    }

  } catch (err) {
    console.error("Unexpected error in card base logic:", err);
    window.location.href = '/404.html';
  }

  function populateDOM(order) {
    // Map standard database columns to matching DOM element IDs
    for (const [key, value] of Object.entries(order)) {
      if (value === null || value === undefined) continue;

      const elements = document.querySelectorAll(`#${key}`);
      elements.forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = value;
        } else if (el.tagName === 'IFRAME') {
          // Handle YouTube embed URL or music embed
          el.src = formatEmbedUrl(value);
        } else if (el.tagName === 'AUDIO' || el.tagName === 'SOURCE') {
          el.src = value;
          // Reload audio to apply new source
          const parentAudio = el.closest('audio');
          if (parentAudio) parentAudio.load();
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = value;
        } else {
          // Default to text content
          el.textContent = value;
        }
      });
    }
  }

  // Helper to format YouTube URLs to embed URLs if needed
  function formatEmbedUrl(url) {
    if (!url) return '';
    // Check if it's already an embed URL
    if (url.includes('/embed/')) return url;

    // Handle youtube.com/watch?v=XXX or youtu.be/XXX
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      videoId = match[2];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&enablejsapi=1`;
    }

    return url;
  }
})();

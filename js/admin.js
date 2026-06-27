/**
 * js/admin.js
 * Admin panel dashboard controller logic
 */

const loginOverlay = document.getElementById('loginOverlay');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const tokenGenForm = document.getElementById('tokenGenForm');
const templateSelect = document.getElementById('templateSelect');
const tokenResultBox = document.getElementById('tokenResultBox');
const generatedLinkInput = document.getElementById('generatedLinkInput');
const btnCopyGenerated = document.getElementById('btnCopyGenerated');
const btnLogout = document.getElementById('btnLogout');

const tokensTableBody = document.getElementById('tokensTableBody');
const ordersTableBody = document.getElementById('ordersTableBody');
const loaderOverlay = document.getElementById('loaderOverlay');
const loaderText = document.getElementById('loaderText');
const toast = document.getElementById('toast');

let activeAdminKey = sessionStorage.getItem('imajiko_admin_key') || '';

// --- 1. DYNAMIC TEMPLATES DROPDOWN POPULATION ---
function populateTemplatesDropdown() {
  if (!window.TEMPLATES) return;
  templateSelect.innerHTML = '';
  Object.entries(window.TEMPLATES).forEach(([id, config]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${config.name} (${config.category})`;
    templateSelect.appendChild(opt);
  });
}

// --- 2. AUTHENTICATION & LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
  populateTemplatesDropdown();
  if (activeAdminKey) {
    verifyKeyAndLoad(activeAdminKey);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPasswordInput').value.trim();
  if (!password) return;

  showLoader(true, '🔑 Memverifikasi password...');
  
  const success = await verifyKeyAndLoad(password);
  showLoader(false);
  
  if (!success) {
    alert('❌ Password admin salah atau tidak valid!');
    document.getElementById('adminPasswordInput').value = '';
  }
});

async function verifyKeyAndLoad(key) {
  try {
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-get-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': key
      },
      body: JSON.stringify({ action: 'list-all' })
    });

    if (response.ok) {
      // Authorization success
      activeAdminKey = key;
      sessionStorage.setItem('imajiko_admin_key', key);
      
      loginOverlay.style.display = 'none';
      adminDashboard.style.display = 'block';
      
      const data = await response.json();
      renderDashboard(data);
      return true;
    } else {
      // Authorization failed
      logout();
      return false;
    }
  } catch (err) {
    console.error("Verification error:", err);
    logout();
    return false;
  }
}

function logout() {
  activeAdminKey = '';
  sessionStorage.removeItem('imajiko_admin_key');
  loginOverlay.style.display = 'flex';
  adminDashboard.style.display = 'none';
}

btnLogout.addEventListener('click', () => {
  logout();
  location.reload();
});

// --- 3. LOAD & RENDER DASHBOARD DATA ---
async function loadDashboardData() {
  if (!activeAdminKey) return;
  showLoader(true, '🔄 Memperbarui data...');
  try {
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-get-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': activeAdminKey
      },
      body: JSON.stringify({ action: 'list-all' })
    });

    if (response.ok) {
      const data = await response.json();
      renderDashboard(data);
    } else {
      alert('Sesi admin berakhir, silakan masuk kembali.');
      logout();
    }
  } catch (err) {
    console.error(err);
    alert('Gagal memuat data dari server.');
  } finally {
    showLoader(false);
  }
}

function renderDashboard(data) {
  renderTokensTable(data.tokens || []);
  renderOrdersTable(data.orders || []);
}

function renderTokensTable(tokens) {
  tokensTableBody.innerHTML = '';
  if (tokens.length === 0) {
    tokensTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #777;">Belum ada token yang terbuat.</td></tr>';
    return;
  }

  tokens.forEach(tok => {
    const tr = document.createElement('tr');
    
    // Status Resolution
    let statusBadge = '';
    const now = new Date();
    const expiresAt = new Date(tok.expires_at);
    
    if (tok.used) {
      statusBadge = '<span class="status-badge badge-used">Terpakai</span>';
    } else if (expiresAt < now) {
      statusBadge = '<span class="status-badge badge-expired">Expired</span>';
    } else {
      statusBadge = '<span class="status-badge badge-active">Aktif</span>';
    }

    const formattedDate = new Date(tok.expires_at).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Make token copyable
    const tokenDisplay = tok.token.length > 10 ? `${tok.token.substring(0, 10)}...` : tok.token;

    tr.innerHTML = `
      <td title="${tok.token}" style="font-family: monospace; font-weight: 700; cursor: pointer;" onclick="copyToClipboard('${tok.token}', 'Token berhasil disalin')">
        ${tokenDisplay} 📋
      </td>
      <td>${tok.template_id}</td>
      <td title="${tok.email}">${tok.email}</td>
      <td>${statusBadge}</td>
      <td>${formattedDate}</td>
      <td>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteToken('${tok.token}')">
          Hapus 🗑️
        </button>
      </td>
    `;
    tokensTableBody.appendChild(tr);
  });
}

function renderOrdersTable(orders) {
  ordersTableBody.innerHTML = '';
  if (orders.length === 0) {
    ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #777;">Belum ada pesanan yang masuk.</td></tr>';
    return;
  }

  orders.forEach(ord => {
    const tr = document.createElement('tr');
    
    const formattedDate = new Date(ord.created_at).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const config = window.TEMPLATES[ord.template_id];
    const cardFile = config ? config.cardFile : `/card/${ord.template_id}.html`;
    const cardUrl = `${window.location.origin}${cardFile}?id=${ord.id}`;

    const orderIdDisplay = ord.id.substring(0, 8);

    tr.innerHTML = `
      <td title="${ord.id}" style="font-family: monospace;">${orderIdDisplay}...</td>
      <td>${ord.template_id}</td>
      <td>${ord.nama_pengirim || '-'}</td>
      <td>${ord.nama_penerima}</td>
      <td title="${ord.email}">${ord.email}</td>
      <td>${formattedDate}</td>
      <td style="display: flex; gap: 8px; justify-content: center;">
        <a href="${cardUrl}" target="_blank" class="btn btn-teal" style="padding: 4px 8px; font-size: 0.75rem;">
          Buka Card ➔
        </a>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteOrder('${ord.id}')">
          Hapus 🗑️
        </button>
      </td>
    `;
    ordersTableBody.appendChild(tr);
  });
}

// --- 4. CREATE NEW TOKEN FLOW ---
tokenGenForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  tokenResultBox.style.display = 'none';

  const template_id = templateSelect.value;
  const email = document.getElementById('buyerEmail').value.trim();
  const expires_in_hours = parseInt(document.getElementById('expireHours').value) || 24;

  if (!template_id || !email) return;

  showLoader(true, '🔑 Membuat token baru...');

  try {
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-generate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': activeAdminKey
      },
      body: JSON.stringify({
        template_id,
        email,
        expires_in_hours
      })
    });

    if (response.ok) {
      const res = await response.json();
      const generatorLink = `${window.location.origin}/generator.html?token=${res.token}&template=${template_id}`;
      
      generatedLinkInput.value = generatorLink;
      tokenResultBox.style.display = 'block';
      
      showToast('🔑 Token sukses terbuat!', '🎉');
      
      // Reset form email
      document.getElementById('buyerEmail').value = '';
      
      // Reload lists
      await loadDashboardData();
    } else {
      const errData = await response.json();
      alert(`Gagal membuat token: ${errData.error || 'Response error'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan saat membuat token.');
  } finally {
    showLoader(false);
  }
});

btnCopyGenerated.addEventListener('click', () => {
  generatedLinkInput.select();
  generatedLinkInput.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(generatedLinkInput.value)
    .then(() => showToast('Link generator disalin ke clipboard!'))
    .catch(() => alert('Gagal menyalin link.'));
});

// --- 5. DELETE ACTIONS ---
async function deleteToken(tokenVal) {
  if (!confirm(`⚠️ Apakah Anda yakin ingin menghapus token "${tokenVal}"?\nSemua order yang berkaitan dengan token ini juga akan dihapus cascade.`)) return;

  showLoader(true, '🗑️ Menghapus token...');
  try {
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-get-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': activeAdminKey
      },
      body: JSON.stringify({
        action: 'delete-token',
        target_id: tokenVal
      })
    });

    if (response.ok) {
      showToast('Token dan order terkait sukses terhapus!', '🗑️');
      await loadDashboardData();
    } else {
      alert('Gagal menghapus token.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  } finally {
    showLoader(false);
  }
}

async function deleteOrder(orderId) {
  if (!confirm('⚠️ Apakah Anda yakin ingin menghapus order ucapan ini?')) return;

  showLoader(true, '🗑️ Menghapus order...');
  try {
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/admin-get-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': activeAdminKey
      },
      body: JSON.stringify({
        action: 'delete-order',
        target_id: orderId
      })
    });

    if (response.ok) {
      showToast('Order berhasil dihapus!', '🗑️');
      await loadDashboardData();
    } else {
      alert('Gagal menghapus order.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  } finally {
    showLoader(false);
  }
}

// Global exposure for onClick triggers
window.deleteToken = deleteToken;
window.deleteOrder = deleteOrder;
window.copyToClipboard = copyToClipboard;

// --- 6. HELPERS (LOADER, TOAST, COPY) ---
function showLoader(show, text = 'Loading...') {
  if (show) {
    loaderText.textContent = text;
    loaderOverlay.style.display = 'flex';
  } else {
    loaderOverlay.style.display = 'none';
  }
}

function showToast(message, icon = '📋') {
  toast.textContent = `${icon} ${message}`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text)
    .then(() => showToast(successMsg, '📋'))
    .catch(() => alert('Gagal menyalin teks.'));
}

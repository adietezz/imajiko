/**
 * js/generator.js
 * Master Generator rebuilt for Supabase & EmailJS
 * Tech Stack: Pure JavaScript, ImgBB Parallel Upload, Supabase Client integration
 */

// --- 1. CONFIGURATION & STATE ---
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const templateId = urlParams.get('template');

let validatedEmail = '';
let validatedTemplateId = '';
const selectedFiles = {}; // Maps field.id to File object

// DOM Elements
const errorState = document.getElementById('errorState');
const formState = document.getElementById('formState');
const generatorForm = document.getElementById('generatorForm');
const dynamicFormContainer = document.getElementById('dynamic-form-container');

const loaderOverlay = document.getElementById('loaderOverlay');
const loaderText = document.getElementById('loaderText');
const successContainer = document.getElementById('successContainer');
const resultUrlInput = document.getElementById('resultUrl');
const btnCopy = document.getElementById('btnCopy');
const btnViewSite = document.getElementById('btnViewSite');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// Initialize EmailJS if available
if (window.emailjs && window.EMAILJS_PUBLIC_KEY) {
  window.emailjs.init(window.EMAILJS_PUBLIC_KEY);
}

// --- 2. RUN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  if (!token || !templateId) {
    showErrorState("Parameter 'token' dan 'template' diperlukan untuk membuka halaman ini. Silakan periksa kembali tautan Anda.");
    return;
  }

  showLoader(true, '🔍 Memvalidasi token Anda...');

  try {
    // Call Supabase Edge Function to validate token
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const res = await response.json();
    showLoader(false);

    if (res.valid) {
      // Check if template matches
      if (res.template_id !== templateId) {
        showErrorState("Token ini tidak cocok dengan template yang dipilih.");
        return;
      }

      // Check if template exists in configuration
      if (!window.TEMPLATES || !window.TEMPLATES[templateId]) {
        showErrorState(`Template "${templateId}" tidak terdaftar di sistem.`);
        return;
      }

      // Save validation details
      validatedEmail = res.email;
      validatedTemplateId = res.template_id;

      // Show form state
      errorState.style.display = 'none';
      formState.style.display = 'block';

      // Render the form fields
      renderDynamicForm(templateId);
    } else {
      let reasonMessage = "Token tidak valid.";
      if (res.reason === "expired") {
        reasonMessage = "Token Anda telah kedaluwarsa (berlaku 24 jam).";
      } else if (res.reason === "used") {
        reasonMessage = "Token ini sudah pernah digunakan.";
      } else if (res.reason === "not_found") {
        reasonMessage = "Token tidak ditemukan. Pastikan tautan yang Anda buka benar.";
      }
      showErrorState(reasonMessage);
    }
  } catch (error) {
    showLoader(false);
    console.error("Token validation error:", error);
    showErrorState("Gagal menghubungi server untuk memvalidasi token. Silakan coba lagi.");
  }
}

// --- 3. SHOW ERROR STATE WITH WA REDIRECT ---
function showErrorState(message) {
  formState.style.display = 'none';
  errorState.style.display = 'block';
  
  const waOwnerLink = `https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mengalami%20kendala%20token%20Imajiko:%20${encodeURIComponent(message)}`;
  
  errorState.innerHTML = `
    <div class="error-badge">⚠️ Akses Ditolak</div>
    <h2 style="margin-top: 15px;">Token Tidak Valid</h2>
    <p style="margin: 15px 0 25px 0; line-height: 1.5; color: #555;">${message}</p>
    <a href="${waOwnerLink}" class="btn-view-site" target="_blank" style="background-color: var(--accent-pink); color: white; display: inline-flex; width: auto; padding: 14px 28px;">
      💬 Hubungi Admin via WhatsApp
    </a>
  `;
}

// --- 4. DYNAMIC FORM RENDERING ---
function renderDynamicForm(themeId) {
  const config = window.TEMPLATES[themeId];
  
  // Update header content
  document.getElementById('themeTitle').textContent = `Generator: ${config.name}`;
  document.getElementById('themeBadge').textContent = config.category;
  
  dynamicFormContainer.innerHTML = ''; // Clear existing fields

  config.fields.forEach(field => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.style.animation = 'slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    const label = document.createElement('label');
    label.innerHTML = `${getFieldIcon(field.type)} ${field.label} ${field.required ? '<span style="color: var(--accent-pink);">*</span>' : ''}`;
    formGroup.appendChild(label);

    if (field.type === 'text' || field.type === 'url') {
      const input = document.createElement('input');
      input.type = field.type === 'url' ? 'url' : 'text';
      input.id = field.id;
      input.placeholder = field.type === 'url' ? 'https://youtube.com/watch?v=...' : `Masukkan ${field.label}`;
      input.required = field.required;
      formGroup.appendChild(input);

    } else if (field.type === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.id = field.id;
      textarea.placeholder = `Tuliskan ${field.label.toLowerCase()} di sini...`;
      textarea.required = field.required;
      formGroup.appendChild(textarea);

    } else if (field.type === 'date') {
      const input = document.createElement('input');
      input.type = 'date';
      input.id = field.id;
      input.required = field.required;
      formGroup.appendChild(input);

    } else if (field.type === 'image') {
      // Render custom drag-and-drop dropzone wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'file-dropzone-wrapper';

      const dropzone = document.createElement('div');
      dropzone.className = 'file-dropzone';
      dropzone.id = `dropzone-${field.id}`;
      dropzone.innerHTML = `
        <div class="icon">📁</div>
        <div class="text-main">Unggah ${field.label}</div>
        <div class="text-sub">Format JPG, PNG, WEBP (Max. 5MB)</div>
        <input type="file" id="file-${field.id}" accept="image/*" ${field.required ? 'required' : ''}>
      `;
      wrapper.appendChild(dropzone);
      formGroup.appendChild(wrapper);

      // Render hidden preview element
      const previewCont = document.createElement('div');
      previewCont.className = 'preview-container';
      previewCont.id = `preview-container-${field.id}`;
      previewCont.style.display = 'none';
      previewCont.innerHTML = `
        <img src="" alt="Preview ${field.label}" class="file-preview" id="preview-img-${field.id}">
        <button type="button" class="btn-remove-preview" id="btn-remove-${field.id}">Ganti Foto ❌</button>
      `;
      formGroup.appendChild(previewCont);

      // Bind events
      const fileInput = dropzone.querySelector('input[type="file"]');
      const previewImg = previewCont.querySelector('.file-preview');
      const removeBtn = previewCont.querySelector('.btn-remove-preview');

      const handleFile = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          showToast('❌ File yang diunggah harus berupa gambar!', '⚠️');
          fileInput.value = '';
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast('❌ Ukuran gambar maksimal 5MB!', '⚠️');
          fileInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          dropzone.style.display = 'none';
          previewCont.style.display = 'flex';
          selectedFiles[field.id] = file;
        };
        reader.readAsDataURL(file);
      };

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          fileInput.files = e.dataTransfer.files;
          handleFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          handleFile(e.target.files[0]);
        }
      });

      removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewImg.src = '';
        previewCont.style.display = 'none';
        dropzone.style.display = 'flex';
        delete selectedFiles[field.id];
      });
    }

    dynamicFormContainer.appendChild(formGroup);
  });
}

function getFieldIcon(type) {
  switch (type) {
    case 'text': return '👤';
    case 'textarea': return '✍️';
    case 'date': return '📅';
    case 'image': return '📸';
    case 'url': return '🔗';
    default: return '🔹';
  }
}

// --- 5. IMGBB IMAGE UPLOAD LOGIC ---
async function uploadToImgBB(file) {
  const apiKey = window.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('Konfigurasi IMGBB_API_KEY hilang di server.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Gagal mengunggah foto ke server penyimpanan.');
  }

  const result = await response.json();
  if (result && result.success && result.data) {
    return result.data.url;
  } else {
    throw new Error('Format respon API ImgBB tidak valid.');
  }
}

async function uploadImagesParallel(filesArray) {
  const uploadPromises = filesArray.map(async (item) => {
    try {
      const url = await uploadToImgBB(item.file);
      return { id: item.id, url: url };
    } catch (error) {
      throw new Error(`[${item.id}] ${error.message}`);
    }
  });

  const results = await Promise.all(uploadPromises);
  const urlMap = {};
  results.forEach(res => {
    urlMap[res.id] = res.url;
  });
  return urlMap;
}

// --- 6. FORM SUBMISSION PIPELINE ---
generatorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  successContainer.style.display = 'none';

  const config = window.TEMPLATES[templateId];
  const payload = {
    token: token,
    template_id: templateId,
    email: validatedEmail
  };

  const filesToUpload = [];
  let hasValidationError = false;

  // Collect values and validate fields
  for (const field of config.fields) {
    if (field.type === 'image') {
      const file = selectedFiles[field.id];
      if (field.required && !file) {
        showToast(`⚠️ Harap unggah foto untuk ${field.label}`, '⚠️');
        hasValidationError = true;
        break;
      }
      if (file) {
        filesToUpload.push({ id: field.id, file: file });
      } else {
        payload[field.id] = '';
      }
    } else {
      const inputEl = document.getElementById(field.id);
      if (inputEl) {
        const val = inputEl.value.trim();
        if (field.required && val === '') {
          showToast(`⚠️ Harap isi bidang ${field.label}`, '⚠️');
          hasValidationError = true;
          break;
        }
        payload[field.id] = val;
      }
    }
  }

  if (hasValidationError) return;

  try {
    // Step 1: Upload Images in Parallel
    if (filesToUpload.length > 0) {
      showLoader(true, `📸 Mengunggah ${filesToUpload.length} foto...`);
      try {
        const uploadedUrls = await uploadImagesParallel(filesToUpload);
        for (const [id, url] of Object.entries(uploadedUrls)) {
          payload[id] = url;
        }
      } catch (uploadError) {
        showLoader(false);
        console.error(uploadError);
        alert(`Gagal mengunggah gambar ke ImgBB:\n${uploadError.message}`);
        return;
      }
    }

    // Step 2: Create Order via Edge Function
    showLoader(true, '💾 Menyimpan data ucapan...');
    const response = await fetch(`${window.SUPABASE_URL}/functions/v1/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server returned status ${response.status}`);
    }

    const res = await response.json();
    const orderId = res.order_id;

    // Step 3: Send Confirmation Email via EmailJS
    if (window.emailjs && window.EMAILJS_SERVICE_ID && window.EMAILJS_TEMPLATE_ID) {
      showLoader(true, '📧 Mengirim email konfirmasi...');
      const finalCardUrl = `${window.location.origin}${config.cardFile}?id=${orderId}`;
      try {
        await window.emailjs.send(
          window.EMAILJS_SERVICE_ID,
          window.EMAILJS_TEMPLATE_ID,
          {
            to_email: validatedEmail,
            template_name: config.name,
            order_id: orderId,
            card_link: finalCardUrl,
            nama_penerima: payload.nama_penerima || 'Penerima'
          }
        );
        console.log("Confirmation email sent via EmailJS.");
      } catch (emailError) {
        console.error("Failed to send email via EmailJS:", emailError);
        // Do not block UI success if email fails, log to console
      }
    }

    // Step 4: Display Success State
    showLoader(false);
    showToast('🎉 Web ucapan berhasil dibuat!', '🚀');

    const finalUrl = `${window.location.origin}${config.cardFile}?id=${orderId}`;
    resultUrlInput.value = finalUrl;
    btnViewSite.href = finalUrl;

    successContainer.style.display = 'block';
    successContainer.scrollIntoView({ behavior: 'smooth' });
    
    // Disable submit to prevent multiple submissions
    document.getElementById('btnSubmit').disabled = true;

  } catch (err) {
    showLoader(false);
    console.error("Order creation error:", err);
    alert(`Gagal membuat web ucapan: ${err.message}`);
  }
});

// --- 7. UX HELPERS (LOADER, TOAST, COPY) ---
function showLoader(show, text = 'Menyulap data...') {
  if (show) {
    loaderText.textContent = text;
    loaderOverlay.style.display = 'flex';
    document.getElementById('btnSubmit').disabled = true;
  } else {
    loaderOverlay.style.display = 'none';
    document.getElementById('btnSubmit').disabled = false;
  }
}

function showToast(message, icon = '📋') {
  toastIcon.textContent = icon;
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Copy to Clipboard logic
btnCopy.addEventListener('click', () => {
  resultUrlInput.select();
  resultUrlInput.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(resultUrlInput.value)
    .then(() => {
      showToast('Link berhasil disalin ke clipboard!');
    })
    .catch(err => {
      console.error('Copy failed: ', err);
      // Fallback
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          showToast('Link berhasil disalin!');
        } else {
          showToast('Gagal menyalin link.', '❌');
        }
      } catch (e) {
        showToast('Gagal menyalin link.', '❌');
      }
    });
});

/**
 * generator.js
 * Master Generator with Dynamic Data-Driven Form architecture
 * Tech Stack: Pure JavaScript, ImgBB Parallel Upload, Firebase Realtime Database Compat
 */

// --- 1. CONFIGURATION & TEMPLATES ---
const TEMPLATE_CONFIG = {
    'ultah-pagoda': {
        title: "Ulang Tahun Pagoda",
        targetHtml: "ultah-pagoda.html",
        fields: [
            { id: 'namaPenerima', label: 'Nama Penerima', type: 'text', placeholder: 'Nama orang yang berulang tahun', required: true },
            { id: 'namaPengirim', label: 'Nama Pengirim', type: 'text', placeholder: 'Nama kamu / pemberi kado', required: true },
            { id: 'pesanUcapan', label: 'Pesan & Ucapan', type: 'textarea', placeholder: 'Tulis ucapan selamat ulang tahun terbaikmu...', required: true },
            { id: 'tanggalLahir', label: 'Tanggal Lahir', type: 'date', required: true },
            { id: 'fotoPenerima', label: 'Foto Penerima', type: 'image', required: true },
            { id: 'fotoBersama', label: 'Foto Bersama (Kenangan)', type: 'image', required: false }
        ]
    },
    'anniv-fuji': {
        title: "Anniversary Fuji Romantic",
        targetHtml: "anniv-fuji.html",
        fields: [
            { id: 'namaPasangan1', label: 'Nama Pasangan 1', type: 'text', placeholder: 'Nama kamu', required: true },
            { id: 'namaPasangan2', label: 'Nama Pasangan 2', type: 'text', placeholder: 'Nama pasanganmu', required: true },
            { id: 'pesanCinta', label: 'Surat Cinta / Pesan', type: 'textarea', placeholder: 'Tuliskan ungkapan hatimu di hari jadi kalian...', required: true },
            { id: 'tanggalAnniversary', label: 'Tanggal Anniversary', type: 'date', required: true },
            { id: 'fotoMoment1', label: 'Foto Momen Kenangan 1', type: 'image', required: true },
            { id: 'fotoMoment2', label: 'Foto Momen Kenangan 2', type: 'image', required: true }
        ]
    }
};

// --- 2. FIREBASE CONFIGURATION & INITIALIZATION ---
// Replace these dummy configurations with your active credentials
const firebaseConfig = {
    apiKey: "MASUKKAN_FIREBASE_API_KEY_DISINI",
    authDomain: "imajiko-ucapan.firebaseapp.com",
    databaseURL: "https://imajiko-ucapan-default-rtdb.firebaseio.com",
    projectId: "imajiko-ucapan",
    storageBucket: "imajiko-ucapan.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase (Compat SDK)
let database;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

// --- 3. DOM ELEMENTS ---
const errorState = document.getElementById('errorState');
const formState = document.getElementById('formState');
const generatorForm = document.getElementById('generatorForm');
const dynamicFormContainer = document.getElementById('dynamic-form-container');
const slugInput = document.getElementById('slugInput');
const domainPrefix = document.getElementById('domainPrefix');

// UI State elements
const loaderOverlay = document.getElementById('loaderOverlay');
const loaderText = document.getElementById('loaderText');
const successContainer = document.getElementById('successContainer');
const resultUrlInput = document.getElementById('resultUrl');
const btnCopy = document.getElementById('btnCopy');
const btnViewSite = document.getElementById('btnViewSite');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// Selected files state map (indexes File objects by their field ID)
const selectedFiles = {};

// --- 4. PARSE PARAMETER & VALIDATION ROUTING ---
const urlParams = new URLSearchParams(window.location.search);
const temaId = urlParams.get('tema');

if (!temaId || !TEMPLATE_CONFIG[temaId]) {
    // Show error banner
    errorState.style.display = 'block';
    formState.style.display = 'none';
} else {
    // Load and render dynamic form
    errorState.style.display = 'none';
    formState.style.display = 'block';
    renderDynamicForm(temaId);
}

// --- 5. DYNAMIC DOM RENDERING PIPELINE ---
/**
 * Renders HTML fields on-the-fly based on template configuration schema
 * @param {string} themeId 
 */
function renderDynamicForm(themeId) {
    const config = TEMPLATE_CONFIG[themeId];
    
    // Update headers and page copy
    document.getElementById('themeTitle').textContent = `Generator: ${config.title}`;
    document.getElementById('themeBadge').textContent = themeId;
    
    const currentOrigin = window.location.origin;
    domainPrefix.textContent = `${currentOrigin}/${config.targetHtml}?id=`;

    dynamicFormContainer.innerHTML = ''; // Reset container

    config.fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.style.animation = 'slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        const label = document.createElement('label');
        label.innerHTML = `${getFieldIcon(field.type)} ${field.label} ${field.required ? '<span style="color: var(--accent-pink);">*</span>' : ''}`;
        formGroup.appendChild(label);

        if (field.type === 'text') {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = field.id;
            input.placeholder = field.placeholder || '';
            input.required = field.required;
            formGroup.appendChild(input);

        } else if (field.type === 'textarea') {
            const textarea = document.createElement('textarea');
            textarea.id = field.id;
            textarea.placeholder = field.placeholder || '';
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
            previewCont.innerHTML = `
                <img src="" alt="Preview ${field.label}" class="file-preview" id="preview-img-${field.id}">
                <button type="button" class="btn-remove-preview" id="btn-remove-${field.id}">Ganti Foto ❌</button>
            `;
            formGroup.appendChild(previewCont);

            // Bind interactivity events to dynamic uploader
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
                    selectedFiles[field.id] = file; // Store File instance in memory
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
                delete selectedFiles[field.id]; // Remove File from memory
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
        default: return '🔹';
    }
}

// --- 6. PARALLEL IMGBB UPLOAD LOGIC ---
/**
 * Single file Fetch upload call to ImgBB API
 * @param {File} file 
 * @returns {Promise<string>} direct image URL
 */
async function uploadToImgBB(file) {
    const apiKey = 'MASUKKAN_API_KEY_DISINI';
    
    if (apiKey === 'MASUKKAN_API_KEY_DISINI') {
        console.warn("Menggunakan dummy API Key ImgBB.");
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Gagal mengunggah foto. Periksa kembali API Key ImgBB Anda.');
    }

    const result = await response.json();
    if (result && result.success && result.data) {
        return result.data.url;
    } else {
        throw new Error('Format respon API ImgBB tidak valid.');
    }
}

/**
 * Executes concurrent image uploads using Promise.all()
 * @param {Array<{id: string, file: File}>} filesArray 
 * @returns {Promise<Object>} keys mapped to their corresponding upload URLs
 */
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

// --- 7. SLUGIFY & RANDOM ALPHANUMERIC GENERATORS ---
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word characters except -
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function generateRandomSlug() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// --- 8. FORM SUBMISSION PIPELINE ---
generatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous results
    successContainer.style.display = 'none';

    const config = TEMPLATE_CONFIG[temaId];
    const payload = {
        template: temaId,
        timestamp: Date.now()
    };

    const filesToUpload = [];
    let hasValidationError = false;

    // Collect field values & build files upload payload queue
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
                payload[field.id] = ''; // Fill with blank value if optional and empty
            }
        } else {
            const inputEl = document.getElementById(field.id);
            if (inputEl) {
                const val = inputEl.value.trim();
                if (field.required && val === '') {
                    showToast(`⚠️ Harap isi field ${field.label}`, '⚠️');
                    hasValidationError = true;
                    break;
                }
                payload[field.id] = val;
            }
        }
    }

    if (hasValidationError) return;

    // Handle Custom Slug resolution
    const rawSlug = slugInput.value.trim();
    let finalSlug = slugify(rawSlug);
    if (finalSlug === '') {
        finalSlug = generateRandomSlug();
    }

    // Step 1: Database Existence Check
    showLoader(true, '🔍 Memeriksa ketersediaan link...');

    if (!database) {
        showLoader(false);
        alert("Firebase belum terkonfigurasi dengan benar. Silakan masukkan config Firebase yang valid pada generator.js");
        return;
    }

    try {
        const slugRef = database.ref('ucapan/' + finalSlug);
        const snapshot = await slugRef.once('value');

        if (snapshot.exists()) {
            showLoader(false);
            alert("Custom link sudah dipakai, pilih yang lain");
            return;
        }

        // Step 2: Parallel Uploads execution if files are queued
        if (filesToUpload.length > 0) {
            setLoaderText(`📸 Sedang mengunggah ${filesToUpload.length} foto secara bersamaan...`);
            try {
                const uploadedUrls = await uploadImagesParallel(filesToUpload);
                
                // Mix uploaded URLs directly back into the payload object
                for (const [id, url] of Object.entries(uploadedUrls)) {
                    payload[id] = url;
                }
            } catch (uploadError) {
                showLoader(false);
                console.error(uploadError);
                alert(`Gagal mengunggah foto ke ImgBB:\n${uploadError.message}\n\nPastikan Anda telah mengisi API Key ImgBB yang valid.`);
                return;
            }
        }

        // Step 3: Write payload to Firebase
        setLoaderText('💾 Menyimpan data ucapan ke database...');
        await slugRef.set(payload);

        // Step 4: Display Success State
        showLoader(false);
        showToast('🎉 Web ucapan berhasil dibuat!', '🚀');

        const finalUrl = `${window.location.origin}/${config.targetHtml}?id=${finalSlug}`;
        resultUrlInput.value = finalUrl;
        btnViewSite.href = finalUrl;

        successContainer.style.display = 'block';
        successContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (dbError) {
        showLoader(false);
        console.error(dbError);
        alert(`Terjadi kesalahan sistem: ${dbError.message}\n\nPastikan izin Firebase database write diatur dengan benar.`);
    }
});

// --- 9. UX HELPERS (LOADER, TOAST, COPY) ---
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

function setLoaderText(text) {
    loaderText.textContent = text;
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
            // Fallback command
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

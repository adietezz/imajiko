/**
 * wisuda-retro.js
 * Graduation newspaper card animation and Supabase data-binding controller
 */

let audioCtx = null;
let currentOrderId = '';

// Web Audio API Synthesis Context
function initAudioSynthesis() {
    window.addEventListener('click', () => {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
    }, { once: true });
}

// Paper rustling sound synthesizer
function playPaperRustle() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const bufferSize = audioCtx.sampleRate * 0.45;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = 0.92 * lastOut + 0.08 * white;
        
        const progress = i / bufferSize;
        let env = 1.0;
        if (progress < 0.15) {
            env = progress / 0.15;
        } else {
            env = 1.0 - (progress - 0.15) / 0.85;
        }
        
        const crackle = Math.random() > 0.96 ? (Math.random() * 0.4) : 0;
        data[i] = (lastOut * 0.35 + crackle * 0.4) * env;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.6;

    noiseNode.connect(filter);
    filter.connect(audioCtx.destination);
    noiseNode.start();
}

// Camera shutter synthesizer
function playCameraShutter() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    const clickOsc = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(600, now);
    clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

    clickGain.gain.setValueAtTime(0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    clickOsc.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.08);

    // Mechanical rewind whir
    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noise.start(now + 0.05);
    noise.stop(now + 0.3);
}

// Typewriter tick synthesizer
function playTypewriterTick() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.04);
}

// --- 2. NEWSPAPER UNROLL SEQUENCE ---
function initNewspaperUnroll() {
    const roll = document.getElementById('newspaper-roll');
    const overlay = document.getElementById('intro-overlay');
    const workspace = document.getElementById('newspaper-workspace');

    if (!roll || !overlay || !workspace) return;

    roll.addEventListener('click', () => {
        playPaperRustle();
        roll.classList.add('unrolled-ribbon');

        setTimeout(() => {
            roll.classList.add('unrolling');
        }, 500);

        setTimeout(() => {
            overlay.classList.add('hidden');
            workspace.classList.add('visible');
            
            // Auto play vinyl audio if browser allows
            const audio = document.getElementById('bg-audio');
            const dock = document.getElementById('vinyl-dock');
            if (audio && dock && audio.paused) {
                audio.play().then(() => {
                    dock.classList.add('playing');
                    document.getElementById('vinyl-status').textContent = 'PLAYING';
                }).catch(e => console.log("Audio autoplay was blocked by browser. User must click disk."));
            }
        }, 1500);
    });
}

// --- 3. CAMERA SHUTTER & ALBUM SLIDER ---
function initCameraShutterAndAlbum() {
    const mainPhoto = document.getElementById('main-photo-frame');
    const flash = document.getElementById('flash-overlay');
    const albumSection = document.getElementById('polaroid-album');
    const albumCloseBtn = document.getElementById('album-close-btn');

    if (!mainPhoto || !flash || !albumSection) return;

    mainPhoto.addEventListener('click', () => {
        flash.classList.add('flash-active');
        setTimeout(() => {
            flash.classList.remove('flash-active');
        }, 80);

        playCameraShutter();
        albumSection.classList.add('active');

        setTimeout(() => {
            albumSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });

    if (albumCloseBtn) {
        albumCloseBtn.addEventListener('click', () => {
            albumSection.classList.remove('active');
            mainPhoto.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

// --- 4. POLAROID STACK CAROUSEL ---
function initPolaroidStack() {
    const cards = Array.from(document.querySelectorAll('.polaroid-card'));
    const nextBtn = document.getElementById('btn-next-polaroid');
    
    if (cards.length === 0) return;

    let currentIndex = 0;

    function updateStackClasses() {
        cards.forEach((card, idx) => {
            card.className = 'polaroid-card';
            const diff = (idx - currentIndex + cards.length) % cards.length;
            
            if (diff === 0) {
                card.classList.add('card-active');
            } else if (diff === 1) {
                card.classList.add('card-next');
            } else if (diff === 2) {
                card.classList.add('card-next-next');
            } else if (diff === cards.length - 1) {
                card.classList.add('card-prev');
            } else {
                card.classList.add('card-hidden');
            }
        });
    }

    updateStackClasses();

    function nextCard() {
        playPaperRustle();
        const activeCard = cards[currentIndex];
        activeCard.classList.remove('card-active');
        activeCard.classList.add('card-prev');
        
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % cards.length;
            updateStackClasses();
        }, 200);
    }

    if (nextBtn) nextBtn.addEventListener('click', nextCard);
    cards.forEach(card => card.addEventListener('click', nextCard));
}

// --- 5. VINYL RECORD PLAYER CONTROL ---
function initVinylPlayer() {
    const audio = document.getElementById('bg-audio');
    const dock = document.getElementById('vinyl-dock');
    const status = document.getElementById('vinyl-status');

    if (!audio || !dock || !status) return;

    function toggleVinyl() {
        if (audio.paused) {
            audio.play().then(() => {
                dock.classList.add('playing');
                status.textContent = 'PLAYING';
            }).catch(e => console.error("Playback failed", e));
        } else {
            audio.pause();
            dock.classList.remove('playing');
            status.textContent = 'PAUSED';
        }
    }

    dock.addEventListener('click', toggleVinyl);
    dock.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            toggleVinyl();
        }
    });
}

// --- 6. DYNAMIC COUNTDOWN TIMER ---
function startCountdownTimer(createdDateString) {
    const dNum = document.getElementById('days-num');
    const hNum = document.getElementById('hours-num');
    const mNum = document.getElementById('mins-num');

    if (!dNum || !hNum || !mNum) return;

    // Set countdown target to exactly 7 days from the order creation date
    const createdTime = createdDateString ? new Date(createdDateString).getTime() : new Date().getTime();
    const targetDate = createdTime + (7 * 24 * 60 * 60 * 1000); 

    function updateCountdown() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            dNum.textContent = '00';
            hNum.textContent = '00';
            mNum.textContent = '00';
            const countdownTitle = document.querySelector('.countdown-box h4');
            if (countdownTitle) countdownTitle.textContent = 'Perayaan Wisuda Selesai!';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        dNum.textContent = String(days).padStart(2, '0');
        hNum.textContent = String(hours).padStart(2, '0');
        mNum.textContent = String(minutes).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 60000);
}

// --- 7. NAMESPACED GUESTBOOK CLASSIFIEDS ---
const DEFAULT_CLASSIFIED_WISHES = [
    { sender: 'Prof. Sudarsono', category: 'ADVICE', text: 'Masa depan cerah menanti mereka yang percaya pada mimpi mereka. Selamat wisuda!' },
    { sender: 'Karina (Rara)', category: 'CONGRATS', text: 'HAPPY GRADUATION!! Akhirnya lulus juga! Bangga banget, yuk kita ngopi rame-rame rayain ini!' },
    { sender: 'Papa & Mama', category: 'WISHES', text: 'Hari ini adalah pembuktian kerja kerasmu. Harapan dan doa restu kami selalu menyertaimu di setiap babak baru kehidupan.' },
    { sender: 'Budi Santoso', category: 'CLASSIFIED', text: 'WANTED: Waktu sejenak untuk mengucapkan selamat atas kelulusan wisudawan teknik kita! Mantap!' }
];

function initGuestbookClassifieds(orderId) {
    const listContainer = document.getElementById('classifieds-list');
    const form = document.getElementById('classified-form');

    if (!listContainer || !form) return;

    // Namespace local storage by order id
    const wishesLocalStorageKey = `graduation_wishes_${orderId}`;

    let wishes = JSON.parse(localStorage.getItem(wishesLocalStorageKey)) || [];
    if (wishes.length === 0) {
        wishes = [...DEFAULT_CLASSIFIED_WISHES];
        localStorage.setItem(wishesLocalStorageKey, JSON.stringify(wishes));
    }

    function renderAd(wish) {
        const item = document.createElement('div');
        item.className = 'classified-ad-item';
        item.innerHTML = `
            <div class="classified-ad-header">
                <span>[ ${wish.category.toUpperCase()} ]</span>
                <span>NO. 026</span>
            </div>
            <div class="classified-ad-content">
                "${wish.text}"
            </div>
            <div class="classified-ad-sender">
                — ${wish.sender}
            </div>
        `;
        listContainer.appendChild(item);
    }

    // Clear loading placeholder
    listContainer.innerHTML = '';
    wishes.forEach(renderAd);

    // Audio sound on typewriter keyboard inputs
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('keypress', () => {
            playTypewriterTick();
        });
    });

    // Form submit telegram handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const sender = document.getElementById('guest-name').value.trim();
        const category = document.getElementById('guest-category').value;
        const text = document.getElementById('guest-message').value.trim();

        if (!sender || !text) return;

        const newWish = { sender, category, text };
        wishes.push(newWish);
        localStorage.setItem(wishesLocalStorageKey, JSON.stringify(wishes));

        renderAd(newWish);

        // Reset input fields
        document.getElementById('guest-name').value = '';
        document.getElementById('guest-message').value = '';

        // Play visual camera flash on guestbook submission
        const flash = document.getElementById('flash-overlay');
        if (flash) {
            flash.classList.add('flash-active');
            setTimeout(() => flash.classList.remove('flash-active'), 80);
        }
        playCameraShutter();
        
        // Scroll to the bottom of wishes grid
        listContainer.scrollTop = listContainer.scrollHeight;
    });
}

// --- 8. DOM DATA MAPPING (SUPABASE EVENT LISTENER) ---
window.addEventListener('orderReady', (event) => {
    const order = event.detail;
    currentOrderId = order.id;

    const namaPenerima = order.nama_penerima || 'Penerima';
    const jurusan = order.jurusan || 'Teknik';
    const pesan = order.pesan || '';
    const fotoUrl = order.foto_url;

    // 1. Sync Text Labels
    document.title = `The Graduation Post | Wisuda ${namaPenerima} 🎓✨`;
    
    const introHeadline = document.getElementById('intro-headline');
    if (introHeadline) introHeadline.textContent = `Undangan Wisuda ${namaPenerima}`;
    
    document.getElementById('nama_penerima').innerText = namaPenerima;
    document.getElementById('jurusan').innerText = jurusan;
    document.getElementById('pesan').innerText = pesan;

    // Format Dates based on creation timestamp
    const dateCreated = order.created_at ? new Date(order.created_at) : new Date();
    
    // Header Edition Date
    const formattedEdisi = dateCreated.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const labelEdisi = document.getElementById('label-tanggal-edisi');
    if (labelEdisi) labelEdisi.textContent = formattedEdisi;

    // Celebration Ceremony Date (Created at + 5 days)
    const dateCeremony = new Date(dateCreated.getTime() + (5 * 24 * 60 * 60 * 1000));
    const formattedAcara = dateCeremony.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const labelAcara = document.getElementById('label-tanggal-acara');
    if (labelAcara) labelAcara.textContent = formattedAcara;

    // Running Ticker Marquee setup
    const tickerContainer = document.getElementById('running-ticker');
    if (tickerContainer) {
        tickerContainer.innerHTML = `
            <span class="ticker-item">Congrats ${namaPenerima}!</span>
            <span class="ticker-item">Class of ${dateCreated.getFullYear()}</span>
            <span class="ticker-item">Special Edition: ${jurusan} Major</span>
            <span class="ticker-item">Congrats ${namaPenerima}!</span>
            <span class="ticker-item">Class of ${dateCreated.getFullYear()}</span>
            <span class="ticker-item">Special Edition: ${jurusan} Major</span>
        `;
    }

    // 2. Personalize Images throughout the layout
    if (fotoUrl) {
        const imgElements = [
            'foto_url',
            'foto_url_inset_1',
            'foto_url_polaroid_1',
            'foto_url_polaroid_2',
            'foto_url_polaroid_3',
            'foto_url_inset_2'
        ];
        imgElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = fotoUrl;
        });
    }

    // 3. Initialize dynamic sub-modules
    startCountdownTimer(order.created_at);
    initGuestbookClassifieds(order.id);
});

// Initialize core page scripts on document ready
document.addEventListener('DOMContentLoaded', () => {
    initAudioSynthesis();
    initNewspaperUnroll();
    initCameraShutterAndAlbum();
    initPolaroidStack();
    initVinylPlayer();
});

// Calendar helper event
function addToCalendar() {
    alert("📅 Kalender disimpan! Acara wisuda ditambahkan ke jadwal Google Calendar Anda.");
}
window.addToCalendar = addToCalendar;

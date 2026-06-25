// Web Audio API Context for Chiptune / SFX Synthesis
let audioCtx = null;
let isAudioPlaying = false;

const bgAudio = document.getElementById('bg-audio-elem');
const tapeWheelLeft = document.getElementById('tape-wheel-left');
const tapeWheelRight = document.getElementById('tape-wheel-right');
const btnPlayPause = document.getElementById('btn-play-pause-elem');
const playIcon = document.getElementById('svg-play-icon');
const pauseIcon = document.getElementById('svg-pause-icon');
const progressBar = document.getElementById('player-progress-bar');

// Dynamic State Parameters
let isCandleBlown = false;

// Customizer content references
const dataContent = {
    penerimaNama: "Kak Nabila",
    penerimaPanggilan: "Nabila",
    pengirimNama: "Ahmad",
    deskripsiHubungan: "Sahabat Terbaikmu",
    suratKapsul: "",
    pol1Desc: "",
    pol2Desc: "",
    pol1Img: "",
    pol2Img: ""
};

// Initialize Audio context safely on user gesture
function initAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
}

// Web Audio API Chiptune SFX Synthesizers (no file dependencies)
function synthMeow() {
    initAudioContext();
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    // Pitch sweeps up, then slightly down (perfect cat meow sound)
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.3);
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.35);
}

function synthCorkPop() {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

    osc.start(now);
    osc.stop(now + 0.08);
}

function synthPuff() {
    initAudioContext();
    if (!audioCtx) return;

    // Generate white noise for blow-out puff
    const bufferSize = audioCtx.sampleRate * 0.22;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.0;

    const gain = audioCtx.createGain();

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noiseNode.start(now);
    noiseNode.stop(now + 0.22);
}

// Play victory notes
function synthSparkleSuccess() {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        
        gain.gain.setValueAtTime(0.01, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.22);
        
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
    });
}

function synthClick() {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.start(now);
    osc.stop(now + 0.04);
}

// --- 1. WELCOME OVERLAY CONTROLLER ---
function openWelcomeBox() {
    const box = document.getElementById('welcome-box');
    box.classList.add('opened');
    
    // Audio setup trigger (mandatory browser compliance)
    initAudioContext();
    
    // Play sweet chime SFX
    setTimeout(() => {
        synthSparkleSuccess();
    }, 100);

    // Animate transition and hide overlay
    setTimeout(() => {
        document.getElementById('welcome-overlay').classList.add('hidden');
        // Auto play backing soundtrack
        playBackingTrack();
    }, 600);
}

// --- 2. RETRO AUDIO PLAYER CONTROLLER ---
function playBackingTrack() {
    bgAudio.play().then(() => {
        isAudioPlaying = true;
        updateAudioUIState();
    }).catch(err => {
        console.log("Autoplay was blocked initially. Waiting for user play toggle.");
        isAudioPlaying = false;
        updateAudioUIState();
    });
}

// --- JS Audio player events ---
function toggleAudio() {
    synthClick();
    if (isAudioPlaying) {
        bgAudio.pause();
        isAudioPlaying = false;
    } else {
        initAudioContext();
        bgAudio.play().catch(err => console.log(err));
        isAudioPlaying = true;
    }
    updateAudioUIState();
}

function updateAudioUIState() {
    if (isAudioPlaying) {
        tapeWheelLeft.classList.add('spinning');
        tapeWheelRight.classList.add('spinning');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        tapeWheelLeft.classList.remove('spinning');
        tapeWheelRight.classList.remove('spinning');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Keep track of audio timeline progression
bgAudio.addEventListener('timeupdate', () => {
    if (bgAudio.duration) {
        const percent = (bgAudio.currentTime / bgAudio.duration) * 100;
        progressBar.style.width = percent + '%';
    }
});

function seekAudio(event) {
    const cont = document.getElementById('player-progress-cont');
    const rect = cont.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    if (bgAudio.duration) {
        bgAudio.currentTime = percent * bgAudio.duration;
    }
}

// --- 3. PHOTO UPLOADER & FILTERING ---
function setPhotoFilter(filterName) {
    synthClick();
    const frame = document.getElementById('illustration-frame');
    frame.classList.remove('filter-line-art', 'filter-monochrome', 'filter-soft-color');
    frame.classList.add('filter-' + filterName);

    // Set button active states
    document.getElementById('btn-filt-line').classList.remove('active');
    document.getElementById('btn-filt-mono').classList.remove('active');
    document.getElementById('btn-filt-soft').classList.remove('active');

    if (filterName === 'line-art') document.getElementById('btn-filt-line').classList.add('active');
    if (filterName === 'monochrome') document.getElementById('btn-filt-mono').classList.add('active');
    if (filterName === 'soft-color') document.getElementById('btn-filt-soft').classList.add('active');
}

function handleUserPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('user-img-preview');
        const svg = document.getElementById('default-svg');
        
        img.src = e.target.result;
        img.style.display = 'block';
        svg.style.display = 'none';
        
        document.getElementById('btn-reset-photo').style.display = 'inline-flex';
        synthSparkleSuccess();
    };
    reader.readAsDataURL(file);
}

function resetToDefaultIllustration() {
    synthClick();
    const img = document.getElementById('user-img-preview');
    const svg = document.getElementById('default-svg');
    const fileInput = document.getElementById('upload-photo');

    img.src = '';
    img.style.display = 'none';
    svg.style.display = 'block';
    fileInput.value = '';

    document.getElementById('btn-reset-photo').style.display = 'none';
}

// --- 4. SWIPE TO UNLOCK GIFT BOX CONTROLLER ---
let dragStartLeft = 0;
let isDragging = false;
let handleElemWidth = 0;
let trackElemWidth = 0;

function startDrag(e) {
    isDragging = true;
    const handle = document.getElementById('swipe-handle-elem');
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    dragStartLeft = clientX - handle.offsetLeft;
    
    // Measure widths dynamically
    handleElemWidth = handle.offsetWidth;
    trackElemWidth = document.getElementById('swipe-track-elem').offsetWidth;

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function dragMove(e) {
    if (!isDragging) return;
    if (e.type.startsWith('touch')) {
        e.preventDefault(); // prevent scrolling while dragging
    }
    const handle = document.getElementById('swipe-handle-elem');
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    
    let newLeft = clientX - dragStartLeft;
    const maxLeft = trackElemWidth - handleElemWidth - 6; // 6px padding offset

    // Constraint boundaries
    if (newLeft < 6) newLeft = 6;
    if (newLeft > maxLeft) newLeft = maxLeft;

    handle.style.left = newLeft + 'px';

    // Check if user completed drag (unlock condition)
    if (newLeft >= maxLeft - 5) {
        unlockGift();
    }
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', endDrag);

    // If not unlocked, snap back home
    const handle = document.getElementById('swipe-handle-elem');
    if (parseInt(handle.style.left) < (trackElemWidth - handleElemWidth - 15)) {
        handle.style.left = '6px';
    }
}

function unlockGift() {
    isDragging = false;
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', endDrag);

    // Triggers audio pops & transitions
    synthSparkleSuccess();
    document.getElementById('gift-closed').classList.add('hidden');
    document.getElementById('gift-opened').classList.add('active');
}

// --- 5. CANDLE BLOWOUT INTERACTION ---
function clickCandle() {
    if (isCandleBlown) return;

    isCandleBlown = true;
    
    // Audio Effects
    synthPuff();
    setTimeout(() => {
        synthSparkleSuccess();
    }, 250);

    // Animate flame out
    document.getElementById('candle-flame-elem').classList.add('out');
    
    // Smoke particle puff
    const smoke = document.getElementById('smoke-puff-elem');
    smoke.classList.add('animate');

    // Toggle card prompt message and reveal sweet letter card
    document.getElementById('cake-prompt-msg').innerHTML = "✨ Lilin Terbakar Indah dalam Doa! ✨";
    document.getElementById('cake-prompt-msg').style.animation = 'none';
    document.getElementById('cake-prompt-msg').style.backgroundColor = 'var(--clay-purple)';

    setTimeout(() => {
        document.getElementById('secret-card').classList.add('visible');
        // Trigger dynamic confetti loop
        triggerConfettiParty();
    }, 400);
}

// --- 6. TIME CAPSULE BOTTLE OPENER ---
function openTimeCapsule() {
    synthCorkPop();
    const bottle = document.getElementById('bottle-container-elem');
    bottle.classList.add('uncorked');
    
    // Delay modal presentation slightly for bottle animation to play out
    setTimeout(() => {
        document.getElementById('letter-modal-elem').classList.add('active');
    }, 600);
}

function closeTimeCapsule() {
    synthClick();
    document.getElementById('letter-modal-elem').classList.remove('active');
    
    // Replace cork
    setTimeout(() => {
        document.getElementById('bottle-container-elem').classList.remove('uncorked');
    }, 300);
}

// --- 7. POLAROID IMAGE FLIPPER ---
function flipPolaroid(card) {
    synthClick();
    card.classList.toggle('flipped');
}

// --- 8. EASTER EGG CATS DIALOG TRIGGERS ---
function showCatSpeech(bubbleText, x, y, alignment) {
    synthMeow();
    const bubble = document.getElementById('cat-bubble');
    bubble.innerHTML = bubbleText;
    bubble.className = 'cat-speech-bubble visible';
    
    // Positioning coordinates
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';

    // Clear after delay
    setTimeout(() => {
        bubble.classList.remove('visible');
    }, 3200);
}

function clickMiloCat(event) {
    event.stopPropagation();
    const text = "Ngeong! 🐾 Selamat ulang tahun, semoga hari-harimu bahagia & makan banyak makanan lezat! 🍰";
    showCatSpeech(text, event.clientX - 60, event.clientY - 95);
}

function clickKuroCat(event) {
    event.stopPropagation();
    const text = "Meoww~ 🐈 Aku Kuro! Kucing pengawas tombol edit. Selamat merayakan hari spesialmu! ✨";
    showCatSpeech(text, event.clientX - 160, event.clientY + 20);
}

function clickOrangeCat(event) {
    event.stopPropagation();
    const text = "Purrr... 💤 Meow~ Chiki sedang tidur tapi mau diselamati ultah juga! Selamat ulang tahun! 🎉";
    showCatSpeech(text, event.clientX - 80, event.clientY - 90);
}

// --- 9. CONTENT CUSTOMIZER MECHANICS ---
function toggleCustomizer() {
    synthClick();
    document.getElementById('customizer-drawer').classList.toggle('active');
}

function updateLiveContent() {
    // Fetch state values from inputs
    const receiverInput = document.getElementById('input-penerima').value;
    const nickInput = document.getElementById('input-panggilan').value;
    const senderInput = document.getElementById('input-pengirim').value;
    const descInput = document.getElementById('input-deskripsi').value;
    const letterInput = document.getElementById('input-surat').value;
    
    const pol1Text = document.getElementById('input-pol1-text').value;
    const pol2Text = document.getElementById('input-pol2-text').value;
    const pol1ImgUrl = document.getElementById('input-pol1').value;
    const pol2ImgUrl = document.getElementById('input-pol2').value;

    // Sync text details across layouts
    document.getElementById('label-penerima-panggilan').innerText = nickInput;
    document.getElementById('overlay-heading').innerText = `Kado untuk ${nickInput}! 🎁`;
    document.getElementById('overlay-subheading').innerText = `Kado spesial dari ${senderInput} dikirimkan khusus untukmu. Tekan kotak kado untuk membukanya!`;
    
    document.getElementById('label-kado-title').innerText = `Kado Spesial dari ${senderInput}`;
    document.getElementById('label-kado-desc').innerText = `Ada kue ulang tahun buatan tangan khusus dari ${senderInput} (${descInput})!`;
    
    document.getElementById('label-reveal-title').innerText = `Selamat Ulang Tahun ${nickInput}! 🎉`;
    document.getElementById('label-reveal-desc').innerText = `Di hari ultahmu ini, ${senderInput} berdoa agar semua keinginan terbaikmu lekas terkabul. Terima kasih telah hadir sebagai sahabat terbaik!`;
    
    document.getElementById('label-surat-title').innerText = `Kapsul Waktu ${nickInput}`;
    document.getElementById('label-surat-meta').innerText = `Ditulis oleh ${senderInput} (${descInput})`;
    document.getElementById('label-surat-body').innerText = letterInput;

    document.getElementById('label-pol1-desc').innerText = pol1Text;
    document.getElementById('label-pol2-desc').innerText = pol2Text;

    // Handle custom URL links for polaroids if pasted
    const pol1Frame = document.querySelector('.polaroid-card:nth-child(1) .polaroid-img-holder');
    if (pol1ImgUrl) {
        pol1Frame.innerHTML = `<img src="${pol1ImgUrl}" alt="Photo 1">`;
    } else {
        // Restore default SVG icon
        pol1Frame.innerHTML = `
            <svg viewBox="0 0 100 100" style="background-color: var(--clay-teal);">
                <circle cx="50" cy="50" r="30" fill="var(--clay-yellow)" stroke="#2B2B2B" stroke-width="2"/>
                <rect x="38" y="45" width="24" height="20" rx="3" fill="var(--clay-pink)" stroke="#2B2B2B" stroke-width="2"/>
                <path d="M62,49 C66,49 68,52 68,55 C68,58 62,58 62,58" fill="none" stroke="#2B2B2B" stroke-width="2"/>
                <path d="M42,40 Q50,34 50,40 Q50,34 58,40" fill="none" stroke="#2B2B2B" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
        `;
    }

    const pol2Frame = document.querySelector('.polaroid-card:nth-child(2) .polaroid-img-holder');
    if (pol2ImgUrl) {
        pol2Frame.innerHTML = `<img src="${pol2ImgUrl}" alt="Photo 2">`;
    } else {
        pol2Frame.innerHTML = `
            <svg viewBox="0 0 100 100" style="background-color: var(--clay-purple);">
                <circle cx="50" cy="55" r="22" fill="var(--clay-white)" stroke="#2B2B2B" stroke-width="2"/>
                <polygon points="34,45 28,30 42,42" fill="var(--clay-white)" stroke="#2B2B2B" stroke-width="2"/>
                <polygon points="66,45 72,30 58,42" fill="var(--clay-white)" stroke="#2B2B2B" stroke-width="2"/>
                <path d="M40,54 Q43,56 45,54" fill="none" stroke="#2B2B2B" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M55,54 Q57,56 60,54" fill="none" stroke="#2B2B2B" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M47,60 L53,60" stroke="#2B2B2B" stroke-width="1.5"/>
                <path d="M25,25 Q20,18 25,12 Q30,18 25,25 Z" fill="var(--clay-pink)" stroke="#2B2B2B" stroke-width="1"/>
            </svg>
        `;
    }
}

// --- 10. LIGHTWEIGHT CONFETTI PARTICLE SYSTEM ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let isConfettiActive = false;

// Resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const colors = ['#FFD2DF', '#E6E1F9', '#D2EBF7', '#FFF2CC', '#FF5E97', '#00f5d4'];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 6;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.speedX = Math.random() * 10 - 5;
        this.speedY = Math.random() * -12 - 5; // shoot upward
        this.gravity = 0.35;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.life = 100;
    }
    update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        this.life -= 0.8;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#2B2B2B';
        ctx.lineWidth = 1.5;
        
        // Draw rounded rectangular piece of confetti
        ctx.beginPath();
        ctx.roundRect(-this.size/2, -this.size/2, this.size, this.size, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function triggerConfettiParty() {
    isConfettiActive = true;
    
    // Spawn initial bursts from left and right sides
    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(0, window.innerHeight * 0.8));
        particles.push(new Particle(window.innerWidth, window.innerHeight * 0.8));
    }

    // Continuous spawn loops
    let counter = 0;
    const spawnInterval = setInterval(() => {
        if (counter > 15 || !isConfettiActive) {
            clearInterval(spawnInterval);
            return;
        }
        for (let i = 0; i < 10; i++) {
            particles.push(new Particle(Math.random() * window.innerWidth, window.innerHeight + 10));
        }
        counter++;
    }, 200);

    animateParticles();
}

function animateParticles() {
    if (!isConfettiActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0 || particles[i].y > window.innerHeight) {
            particles.splice(i, 1);
        }
    }

    if (particles.length > 0) {
        requestAnimationFrame(animateParticles);
    } else {
        isConfettiActive = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Initialize state on DOM load
window.addEventListener('DOMContentLoaded', () => {
    updateLiveContent();
    
    // Bob head black cat ("Kuro") loop matching playing music
    setInterval(() => {
        const kuro = document.getElementById('cat-kuro');
        if (isAudioPlaying && kuro) {
            kuro.style.transform = `translateY(${Math.sin(Date.now() / 150) * 3}px) rotate(${Math.sin(Date.now() / 150) * 2}deg) scale(1.05)`;
        } else if (kuro) {
            kuro.style.transform = '';
        }
    }, 60);
});

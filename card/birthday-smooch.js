// card/birthday-smooch.js
// Client-side interactions and Supabase data binding for Birthday Smooch

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

// YouTube Player Integration State
let ytPlayer = null;
let isYouTubeAudio = false;

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

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.start(now);
    osc.stop(now + 0.04);
}

// --- 2. AUDIO DECK CONTROLLER ---
function toggleAudio() {
    synthClick();
    
    // Toggle YouTube background music if applicable
    if (isYouTubeAudio && ytPlayer && typeof ytPlayer.getPlayerState === 'function') {
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            isAudioPlaying = false;
        } else {
            initAudioContext();
            ytPlayer.playVideo();
            isAudioPlaying = true;
        }
        updateAudioUIState();
        return;
    }

    // Toggle standard HTML5 audio
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

// Keep track of audio timeline progression (Fallback Audio Element Only)
bgAudio.addEventListener('timeupdate', () => {
    if (bgAudio.duration && !isYouTubeAudio) {
        const percent = (bgAudio.currentTime / bgAudio.duration) * 100;
        progressBar.style.width = percent + '%';
    }
});

function seekAudio(event) {
    if (isYouTubeAudio) return; // Disallow timeline seeking for YT embeds

    const cont = document.getElementById('player-progress-cont');
    const rect = cont.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = clickX / rect.width;
    if (bgAudio.duration) {
        bgAudio.currentTime = percent * bgAudio.duration;
    }
}

// --- 3. PHOTO FILTERING ---
function setPhotoFilter(filterName) {
    synthClick();
    const frame = document.getElementById('illustration-frame');
    frame.className = 'photo-frame'; // Reset classes
    frame.classList.add('filter-' + filterName);

    // Set button active states
    document.getElementById('btn-filt-line').classList.remove('active');
    document.getElementById('btn-filt-mono').classList.remove('active');
    document.getElementById('btn-filt-soft').classList.remove('active');

    if (filterName === 'line-art') document.getElementById('btn-filt-line').classList.add('active');
    if (filterName === 'monochrome') document.getElementById('btn-filt-mono').classList.add('active');
    if (filterName === 'soft-color') document.getElementById('btn-filt-soft').classList.add('active');
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
        e.preventDefault(); // prevent scrolling
    }
    const handle = document.getElementById('swipe-handle-elem');
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    
    let newLeft = clientX - dragStartLeft;
    const maxLeft = trackElemWidth - handleElemWidth - 6;

    if (newLeft < 6) newLeft = 6;
    if (newLeft > maxLeft) newLeft = maxLeft;

    handle.style.left = newLeft + 'px';

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

    synthSparkleSuccess();
    document.getElementById('gift-closed').classList.add('hidden');
    document.getElementById('gift-opened').classList.add('active');
}

// --- 5. CANDLE BLOWOUT INTERACTION ---
function clickCandle() {
    if (isCandleBlown) return;
    isCandleBlown = true;
    
    synthPuff();
    setTimeout(() => {
        synthSparkleSuccess();
    }, 250);

    document.getElementById('candle-flame-elem').classList.add('out');
    document.getElementById('smoke-puff-elem').classList.add('animate');

    document.getElementById('cake-prompt-msg').innerHTML = "✨ Lilin Terbakar Indah dalam Doa! ✨";
    document.getElementById('cake-prompt-msg').style.animation = 'none';
    document.getElementById('cake-prompt-msg').style.backgroundColor = 'var(--clay-purple)';

    setTimeout(() => {
        document.getElementById('secret-card').classList.add('visible');
        triggerConfettiParty();
    }, 400);
}

// --- 6. TIME CAPSULE BOTTLE OPENER ---
function openTimeCapsule() {
    synthCorkPop();
    const bottle = document.getElementById('bottle-container-elem');
    bottle.classList.add('uncorked');
    
    setTimeout(() => {
        document.getElementById('letter-modal-elem').classList.add('active');
    }, 600);
}

function closeTimeCapsule() {
    synthClick();
    document.getElementById('letter-modal-elem').classList.remove('active');
    
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
function showCatSpeech(bubbleText, x, y) {
    synthMeow();
    const bubble = document.getElementById('cat-bubble');
    bubble.innerHTML = bubbleText;
    bubble.className = 'cat-speech-bubble visible';
    
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';

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
    const text = "Meoww~ 🐈 Aku Kuro! Kucing dekorasi terlucu. Selamat merayakan hari spesialmu! ✨";
    showCatSpeech(text, event.clientX - 160, event.clientY - 95);
}

function clickOrangeCat(event) {
    event.stopPropagation();
    const text = "Purrr... 💤 Meow~ Chiki sedang tidur tapi mau diselamati ultah juga! Selamat ulang tahun! 🎉";
    showCatSpeech(text, event.clientX - 80, event.clientY - 90);
}

// --- 9. LIGHTWEIGHT CONFETTI PARTICLE SYSTEM ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let isConfettiActive = false;

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
        this.speedY = Math.random() * -12 - 5; 
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
        
        ctx.beginPath();
        ctx.roundRect(-this.size/2, -this.size/2, this.size, this.size, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function triggerConfettiParty() {
    isConfettiActive = true;
    
    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(0, window.innerHeight * 0.8));
        particles.push(new Particle(window.innerWidth, window.innerHeight * 0.8));
    }

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

// --- 10. SUPABASE DATABASE BINDING & YOUTUBE PLAYER INIT ---
window.addEventListener('orderReady', (event) => {
    const order = event.detail;
    
    const namaPenerima = order.nama_penerima || 'Nabila';
    const namaPengirim = order.nama_pengirim || 'Ahmad';
    const pesan = order.pesan || '';
    const fotoUrl = order.foto_url;
    const musikUrl = order.musik_url;

    // 1. Map content dynamically across UI labels
    document.getElementById('label-penerima-panggilan').innerText = namaPenerima;
    document.getElementById('overlay-heading').innerText = `Kado untuk ${namaPenerima}! 🎁`;
    document.getElementById('overlay-subheading').innerText = `Kado spesial dari ${namaPengirim} dikirimkan khusus untukmu. Tekan kotak kado untuk membukanya!`;
    
    document.getElementById('label-kado-title').innerText = `Kado Spesial dari ${namaPengirim}`;
    
    const hubungan = (order.custom_fields && order.custom_fields.hubungan) || 'Teman Baik';
    document.getElementById('label-kado-desc').innerText = `Ada kue ulang tahun buatan tangan khusus dari ${namaPengirim} (${hubungan})!`;
    
    document.getElementById('label-reveal-title').innerText = `Selamat Ulang Tahun ${namaPenerima}! 🎉`;
    document.getElementById('label-reveal-desc').innerText = `Di hari ultahmu ini, ${namaPengirim} berdoa agar semua keinginan terbaikmu lekas terkabul.`;
    
    document.getElementById('label-surat-title').innerText = `Kapsul Waktu ${namaPenerima}`;
    document.getElementById('label-surat-meta').innerText = `Ditulis oleh ${namaPengirim} (${hubungan})`;
    document.getElementById('label-surat-body').innerText = pesan;

    // 2. Handle Polaroid/Illustration picture setup
    const polImg = document.getElementById('foto_url');
    const defaultSvg = document.getElementById('default-svg');
    if (fotoUrl) {
        polImg.src = fotoUrl;
        polImg.style.display = 'block';
        if (defaultSvg) defaultSvg.style.display = 'none';
    } else {
        polImg.style.display = 'none';
        if (defaultSvg) defaultSvg.style.display = 'block';
    }

    // 3. Handle Background Music Setup
    if (musikUrl) {
        const isYouTube = musikUrl.includes('youtube.com') || musikUrl.includes('youtu.be') || musikUrl.includes('/embed/');
        
        if (isYouTube) {
            // Remove audio element source
            bgAudio.src = '';
            isYouTubeAudio = true;
            // Trigger YT initialization once API loads
            setupYouTubePlayer();
        } else {
            // Standard MP3 audio URL
            isYouTubeAudio = false;
            bgAudio.src = musikUrl;
            bgAudio.load();
        }
    }
});

// Setup YouTube Player controls
function setupYouTubePlayer() {
    if (window.YT && window.YT.Player) {
        initYTPlayer();
    }
}

// Initialized by YT Iframe API script load
window.onYouTubeIframeAPIReady = function () {
    if (isYouTubeAudio) {
        initYTPlayer();
    }
};

function initYTPlayer() {
    ytPlayer = new YT.Player('musik_url', {
        events: {
            'onReady': () => {
                console.log("YouTube Background Player initialized successfully.");
            },
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    isAudioPlaying = true;
                    updateAudioUIState();
                } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                    isAudioPlaying = false;
                    updateAudioUIState();
                }
            }
        }
    });
}

// Initialize state on DOM load
window.addEventListener('DOMContentLoaded', () => {
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

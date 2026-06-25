/* ==========================================================================
   THE GRADUATION POST - PREMIUM INTERACTIVE SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initAudioSynthesis();
    initNewspaperUnroll();
    initCameraShutterAndAlbum();
    initPolaroidStack();
    initCountdownTimer();
    initGuestbookClassifieds();
    initVinylPlayer();
});

// ==========================================================================
// 1. WEB AUDIO API SYNTHESIZER (No external assets required!)
// ==========================================================================
let audioCtx = null;

function initAudioSynthesis() {
    // AudioContext will be initialized on first user interaction
    window.addEventListener('click', () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }, { once: true });
}

// Synthesize a crisp paper rustling/unrolling sound
function playPaperRustle() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const bufferSize = audioCtx.sampleRate * 0.45; // 0.45 seconds duration
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill buffer with white noise + filtered low frequency variations
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Low-pass filter noise to make it crinkly instead of static hiss
        lastOut = 0.92 * lastOut + 0.08 * white;
        
        // Envelope: quick attack, wavy sustain, decay
        const progress = i / bufferSize;
        let env = 1.0;
        if (progress < 0.15) {
            env = progress / 0.15; // fast attack
        } else {
            env = 1.0 - (progress - 0.15) / 0.85; // gradual decay
        }
        
        // Add crackling amplitude spikes
        const crackle = Math.random() > 0.96 ? (Math.random() * 0.4) : 0;
        data[i] = (lastOut * 0.35 + crackle * 0.4) * env;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to shape the frequency spectrum
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.6;

    noiseNode.connect(filter);
    filter.connect(audioCtx.destination);
    noiseNode.start();
}

// Synthesize a camera shutter click + mechanical winding sound
function playCameraShutter() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Part 1: The fast high-frequency click (shutter blades)
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

    // Part 2: Mechanical whir/winding (white noise)
    const bufferSize = audioCtx.sampleRate * 0.25; // 0.25 seconds
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

// Synthesize a typewriter key-down tick sound (for guestbook)
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

// ==========================================================================
// 2. NEWSPAPER UNROLL CONTROLLER
// ==========================================================================
function initNewspaperUnroll() {
    const roll = document.getElementById('newspaper-roll');
    const overlay = document.getElementById('intro-overlay');
    const workspace = document.getElementById('newspaper-workspace');

    if (!roll || !overlay || !workspace) return;

    roll.addEventListener('click', () => {
        // Trigger paper sound
        playPaperRustle();

        // 1. Animate ribbon popping off
        roll.classList.add('unrolled-ribbon');

        // 2. Animate paper expanding & splitting
        setTimeout(() => {
            roll.classList.add('unrolling');
        }, 500);

        // 3. Reveal main newspaper layout
        setTimeout(() => {
            overlay.classList.add('hidden');
            workspace.classList.add('visible');
            
            // Auto play vinyl audio when newspaper is opened (optional but friendly)
            const audio = document.getElementById('bg-audio');
            const dock = document.getElementById('vinyl-dock');
            if (audio && dock && audio.paused) {
                audio.play().then(() => {
                    dock.classList.add('playing');
                    document.getElementById('vinyl-status').textContent = 'PLAYING';
                }).catch(e => {
                    console.log("Auto-play blocked by browser. User must interact first.");
                });
            }
        }, 1500);
    });
}

// ==========================================================================
// 3. CAMERA SHUTTER & ALBUM CONTROLLER
// ==========================================================================
function initCameraShutterAndAlbum() {
    const mainPhoto = document.getElementById('main-photo-frame');
    const flash = document.getElementById('flash-overlay');
    const albumSection = document.getElementById('polaroid-album');
    const albumCloseBtn = document.getElementById('album-close-btn');

    if (!mainPhoto || !flash || !albumSection) return;

    // When clicking the main headline photo
    mainPhoto.addEventListener('click', () => {
        // Trigger visual screen flash
        flash.classList.add('flash-active');
        setTimeout(() => {
            flash.classList.remove('flash-active');
        }, 80);

        // Play sound effect
        playCameraShutter();

        // Open/Toggle album section
        albumSection.classList.add('active');

        // Smooth scroll to the album
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

// ==========================================================================
// 4. POLAROID STACK CAROUSEL
// ==========================================================================
function initPolaroidStack() {
    const cards = Array.from(document.querySelectorAll('.polaroid-card'));
    const nextBtn = document.getElementById('btn-next-polaroid');
    
    if (cards.length === 0) return;

    let currentIndex = 0;

    function updateStackClasses() {
        cards.forEach((card, idx) => {
            card.className = 'polaroid-card'; // reset classes
            
            // Calculate indices in the loop
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

    // Initialize layout
    updateStackClasses();

    // Swipe/Cycle click handler
    function nextCard() {
        // Synthesize small card click/rustle sound
        playPaperRustle();
        
        // Animate out active card
        const activeCard = cards[currentIndex];
        activeCard.classList.remove('card-active');
        activeCard.classList.add('card-prev'); // move left out of view
        
        setTimeout(() => {
            currentIndex = (currentIndex + 1) % cards.length;
            updateStackClasses();
        }, 200);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', nextCard);
    }

    // Also cycle card when clicking the card itself
    cards.forEach(card => {
        card.addEventListener('click', nextCard);
    });
}

// ==========================================================================
// 5. COUNTDOWN TIMER
// ==========================================================================
function initCountdownTimer() {
    const dNum = document.getElementById('days-num');
    const hNum = document.getElementById('hours-num');
    const mNum = document.getElementById('mins-num');

    if (!dNum || !hNum || !mNum) return;

    // Let's set target date: dynamically 3 days and 12 hours from current visit,
    // so it always looks alive and ticking, OR Saturday June 20, 2026.
    // Since we want to make it realistic, let's hardcode a celebration date in the near future.
    // If today is 2026-06-25, let's make it 2026-07-04 (Independence Day, Saturday, a perfect celebration day).
    const targetDate = new Date('July 4, 2026 17:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            dNum.textContent = '00';
            hNum.textContent = '00';
            mNum.textContent = '00';
            document.querySelector('.countdown-box h4').textContent = 'Wisuda Telah Berlangsung!';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        // Format to double digits
        dNum.textContent = String(days).padStart(2, '0');
        hNum.textContent = String(hours).padStart(2, '0');
        mNum.textContent = String(minutes).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 60000); // update every minute
}

// ==========================================================================
// 6. CLASSIFIED ADS GUESTBOOK
// ==========================================================================
const DEFAULT_CLASSIFIED_WISHES = [
    {
        sender: 'Prof. Sudarsono',
        category: 'ADVICE',
        text: 'The future belongs to those who believe in the beauty of their dreams. Congratulations on your achievement, Samira!'
    },
    {
        sender: 'Karina (Rara)',
        category: 'CONGRATS',
        text: 'HAPPY GRADUATION SAM! Finally she did it! So proud of you, cant wait to celebrate next week over coffee!'
    },
    {
        sender: 'Papa & Mama',
        category: 'WISHES',
        text: 'Hari ini satu langkah besar telah tercapai. Harapan dan doa kami selalu menyertaimu di setiap babak baru kehidupanmu, Nak.'
    },
    {
        sender: 'Budi Santoso',
        category: 'CLASSIFIED',
        text: 'WANTED: A brief pause to celebrate this amazing mind! Congrats on your graduation from engineering school!'
    }
];

function initGuestbookClassifieds() {
    const listContainer = document.getElementById('classifieds-list');
    const form = document.getElementById('classified-form');

    if (!listContainer || !form) return;

    // Load messages from localStorage, merge with default wishes
    let wishes = JSON.parse(localStorage.getItem('graduation_wishes')) || [];
    if (wishes.length === 0) {
        wishes = [...DEFAULT_CLASSIFIED_WISHES];
        localStorage.setItem('graduation_wishes', JSON.stringify(wishes));
    }

    // Function to render single classified ad
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

    // Render all initial wishes
    wishes.forEach(renderAd);

    // Audio tick on typing
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('keypress', () => {
            playTypewriterTick();
        });
    });

    // Form submit listener
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('guest-name');
        const catInput = document.getElementById('guest-category');
        const textInput = document.getElementById('guest-message');

        if (!nameInput.value.trim() || !textInput.value.trim()) {
            alert('Please fill in all details, telegram sender!');
            return;
        }

        const newWish = {
            sender: nameInput.value.trim(),
            category: catInput.value,
            text: textInput.value.trim()
        };

        // Play mechanical winding / success sound
        playPaperRustle();

        // Save & Render
        wishes.push(newWish);
        localStorage.setItem('graduation_wishes', JSON.stringify(wishes));
        renderAd(newWish);

        // Reset fields
        nameInput.value = '';
        textInput.value = '';
        
        // Scroll to the new classified item smoothly
        setTimeout(() => {
            listContainer.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    });
}

// ==========================================================================
// 7. VINYL PLAYER CONTROLLER
// ==========================================================================
function initVinylPlayer() {
    const dock = document.getElementById('vinyl-dock');
    const audio = document.getElementById('bg-audio');
    const statusText = document.getElementById('vinyl-status');

    if (!dock || !audio) return;

    dock.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                dock.classList.add('playing');
                statusText.textContent = 'PLAYING';
            }).catch(e => {
                console.error("Playback failed", e);
            });
        } else {
            audio.pause();
            dock.classList.remove('playing');
            statusText.textContent = 'PAUSED';
        }
    });
}

// Add event to Google Calendar or trigger a file download for Calendar
function addToCalendar() {
    // Basic Google Calendar event link:
    // Event: Saturday, July 4, 2026, 17:00:00 - 21:00:00
    const title = encodeURIComponent("Samira's Graduation Party Celebration");
    const dates = "20260704T170000/20260704T210000";
    const details = encodeURIComponent("Join us in celebrating Samira Hadid's amazing milestone! RSVP to +123 456 7890.");
    const location = encodeURIComponent("Borcelle Hall, 5th Avenue, New York");
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
}
window.addToCalendar = addToCalendar; // bind globally

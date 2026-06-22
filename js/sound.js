/**
 * MakeReign-style Gamified Sound Synthesizer (Web Audio API)
 * Generates custom retro sounds for jumps, failures, scores, and chiptune loop.
 * Upgraded to support HTML5 Audio players for playing chiptune MP3s with a 3.0s Spotify-like equal-power crossfade.
 */
class GamifiedSoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingBgm = false;
    this.currentTrackIndex = 0;
    this.isShuffle = true; // Shuffle is active by default
    this.isTransitioning = false; // Flag to prevent double triggers
    
    // Double audio players for crossfading
    this.audio1 = new Audio();
    this.audio2 = new Audio();
    
    this.activePlayer = null;
    this.fadePlayer = null;
    this.fadeInterval = null;
    
    // Callbacks for UI updates
    this.onBgmStateChange = null;
    this.onTrackEnd = null;
    this.onTimeUpdate = null;

    // The 34 tracks from the cassete folder with cleaned official names and artists
    this.tracks = [
      { file: "ALL WE KNOW  GrowTopia.mp3", name: "All We Know", artist: "The Chainsmokers" },
      { file: "Ariel noah - moshimo mada itsuka  GrowTopia.mp3", name: "Moshimo Mada Itsuka", artist: "Ariel NOAH" },
      { file: "Asal kau bahagia  GrowTopia.mp3", name: "Asal Kau Bahagia", artist: "Armada" },
      { file: "Cruel angel Thesis  GrowTopia.mp3", name: "A Cruel Angel's Thesis", artist: "Yoko Takahashi" },
      { file: "Golden Hour  GrowTopia.mp3", name: "Golden Hour", artist: "JVKE" },
      { file: "Goose House - hikarunara  GrowTopia.mp3", name: "Hikaru Nara", artist: "Goose House" },
      { file: "GrowToSong  A little happiness bebe tien.mp3", name: "A Little Happiness", artist: "Hebe Tien" },
      { file: "GrowToSong  ALL Fals Down - Alan Walker.mp3", name: "All Falls Down", artist: "Alan Walker" },
      { file: "GrowToSong  ALONE PT II 'Alan walker FT.ava max.mp3", name: "Alone, Pt. II", artist: "Alan Walker & Ava Max" },
      { file: "GrowToSong  Abcdefu -Gayle.mp3", name: "abcdefu", artist: "GAYLE" },
      { file: "GrowToSong  Akuma noko BY Shinjirou.mp3", name: "Akuma no Ko", artist: "Ai Higuchi" },
      { file: "GrowToSong  Angle baby troye sivan.mp3", name: "Angel Baby", artist: "Troye Sivan" },
      { file: "GrowToSong  Apologize - one Republic.mp3", name: "Apologize", artist: "OneRepublic" },
      { file: "GrowToSong  Are You Bored Yet (1).mp3", name: "Are You Bored Yet? (Alt)", artist: "Wallows" },
      { file: "GrowToSong  Are You Bored Yet.mp3", name: "Are You Bored Yet?", artist: "Wallows" },
      { file: "GrowToSong  Chainsmoker Closer 【✔️】.mp3", name: "Closer", artist: "The Chainsmokers" },
      { file: "GrowToSong  Cloud bread.mp3", name: "Cloud Bread Theme", artist: "Hong Sang-ji" },
      { file: "GrowToSong  Counting Star 【✔️】.mp3", name: "Counting Stars", artist: "OneRepublic" },
      { file: "GrowToSong  Guruku Tersayang 【✔️】.mp3", name: "Guruku Tersayang", artist: "Sartono" },
      { file: "GrowToSong  KimiNoT Toriko.mp3", name: "Kimi No Toriko", artist: "Rizky Ayuba" },
      { file: "GrowToSong  Last Christmas.mp3", name: "Last Christmas", artist: "Wham!" },
      { file: "GrowToSong  Memories -LadyWrrior.mp3", name: "Memories", artist: "Maroon 5" },
      { file: "GrowToSong  Thats what i like Bruno-Mars.mp3", name: "That's What I Like", artist: "Bruno Mars" },
      { file: "GrowToSong  _Weekly -After school_ - (320 Kbps).mp3", name: "After School", artist: "Weeekly" },
      { file: "Jkt48 - Seventeen  GrowTopia.mp3", name: "Seventeen", artist: "JKT48" },
      { file: "Mary On A Cross  GrowTopia.mp3", name: "Mary On A Cross", artist: "Ghost" },
      { file: "River Flows You  GrowTopia.mp3", name: "River Flows in You", artist: "Yiruma" },
      { file: "See You Again OG  GrowTopia.mp3", name: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth" },
      { file: "Stitches - Shawn Mendes  GrowTopia.mp3", name: "Stitches", artist: "Shawn Mendes" },
      { file: "Superhero - Script  GrowTopia.mp3", name: "Superheroes", artist: "The Script" },
      { file: "We'll meet again  GrowTopia.mp3", name: "We'll Meet Again", artist: "Vera Lynn" },
      { file: "Yoasobi - Racing into the Night  GrowTopia.mp3", name: "Racing into the Night", artist: "YOASOBI" },
      { file: "Yoasobi probably  GrowTopia.mp3", name: "Probably", artist: "YOASOBI" },
      { file: "Your lie in April  GrowTopia.mp3", name: "Hikaru Nara (Music Box)", artist: "Your Lie in April" }
    ];

    this.playlist = [];
    this.shufflePlaylist();
    this.setupAudioListeners();
  }

  shufflePlaylist() {
    const tempTracks = [...this.tracks];
    // Fisher-Yates shuffle
    for (let i = tempTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tempTracks[i], tempTracks[j]] = [tempTracks[j], tempTracks[i]];
    }
    this.playlist = tempTracks;
    this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    const currentTrack = this.playlist[this.currentTrackIndex];
    
    if (this.isShuffle) {
      // Shuffle the list, putting the currently playing track first so it remains playing
      const temp = [...this.tracks];
      const indexInTracks = temp.findIndex(t => t.file === currentTrack.file);
      if (indexInTracks !== -1) {
        temp.splice(indexInTracks, 1);
      }
      for (let i = temp.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [temp[i], temp[j]] = [temp[j], temp[i]];
      }
      this.playlist = [currentTrack, ...temp];
      this.currentTrackIndex = 0;
    } else {
      // Restore standard track alphabetical/default array order
      this.playlist = [...this.tracks];
      const indexInOriginal = this.playlist.findIndex(t => t.file === currentTrack.file);
      if (indexInOriginal !== -1) {
        this.currentTrackIndex = indexInOriginal;
      }
    }

    if (typeof this.onBgmStateChange === "function") {
      this.onBgmStateChange();
    }
  }

  setupAudioListeners() {
    const handleEnded = () => {
      // Fallback ended event trigger
      if (this.isPlayingBgm && !this.isTransitioning) {
        let nextIndex = this.currentTrackIndex + 1;
        if (nextIndex >= this.playlist.length) {
          nextIndex = 0;
        }
        this.crossfadeTo(nextIndex);
      }
    };

    this.audio1.addEventListener("ended", handleEnded);
    this.audio2.addEventListener("ended", handleEnded);

    // timeupdate updates timeline + triggers pre-end crossfade (3.0s early)
    const handleTimeUpdate = (e) => {
      if (this.activePlayer === e.target) {
        if (typeof this.onTimeUpdate === "function") {
          const percent = (e.target.currentTime / e.target.duration) * 100 || 0;
          this.onTimeUpdate(percent);
        }

        const duration = e.target.duration;
        const currentTime = e.target.currentTime;
        if (duration && !this.isTransitioning && this.isPlayingBgm) {
          // Trigger crossfade exactly 3 seconds before the end of the song
          if (duration - currentTime <= 3.0) {
            let nextIndex = this.currentTrackIndex + 1;
            if (nextIndex >= this.playlist.length) {
              nextIndex = 0;
            }
            this.crossfadeTo(nextIndex);
          }
        }
      }
    };

    this.audio1.addEventListener("timeupdate", handleTimeUpdate);
    this.audio2.addEventListener("timeupdate", handleTimeUpdate);
  }

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported.");
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    // Master volume control for Web Audio synthesized SFX
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.2, this.ctx.currentTime); // Low volume
    this.masterGain.connect(this.ctx.destination);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      const vol = this.isMuted ? 0 : 0.2;
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
    
    // Mute/unmute active HTML5 Audio players
    const targetVol = this.isMuted ? 0 : 0.4;
    if (this.audio1) this.audio1.volume = this.audio1 === this.activePlayer ? targetVol : 0;
    if (this.audio2) this.audio2.volume = this.audio2 === this.activePlayer ? targetVol : 0;
    
    return this.isMuted;
  }

  playTone(freq, type, duration, volume, slideToFreq = null) {
    if (!this.ctx || this.isMuted) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = type; // sine, square, sawtooth, triangle
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
    }
    
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // SFX: Retro Hover Blip
  playHover() {
    this.playTone(600, 'sine', 0.04, 0.05, 900);
  }

  // SFX: Snappy Menu Click
  playClick() {
    this.playTone(440, 'triangle', 0.08, 0.1, 880);
  }

  // SFX: Runner Game Jump ("Boing" sound)
  playJump() {
    this.playTone(180, 'triangle', 0.18, 0.15, 600);
  }

  // SFX: Point Scored / Coin Obtained (Mario coin)
  playCoin() {
    if (!this.ctx || this.isMuted) return;
    this.playTone(987.77, 'square', 0.07, 0.08); // B5
    setTimeout(() => {
      this.playTone(1318.51, 'square', 0.2, 0.08); // E6
    }, 70);
  }

  // SFX: Damage Hit (Noise burst or low buzz)
  playHit() {
    if (!this.ctx || this.isMuted) return;
    this.playTone(150, 'sawtooth', 0.25, 0.25, 40);
  }

  // SFX: Comic Sans / Bad Design Warning Buzzer
  playBuzzer() {
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.linearRampToValueAtTime(100, now + 0.4);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(112, now);
    osc2.frequency.linearRampToValueAtTime(102, now + 0.4);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.4);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // SFX: Game Over
  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.3, 0.12, freq * 0.9);
      }, index * 200);
    });
  }

  // SFX: Game Start / Level Up
  playGameStart() {
    if (!this.ctx || this.isMuted) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.5];
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.15, 0.1, freq * 1.1);
      }, index * 80);
    });
  }

  // BGM: Play background music
  startBGM() {
    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;
    
    if (!this.activePlayer) {
      this.activePlayer = this.audio1;
      const track = this.playlist[this.currentTrackIndex];
      this.activePlayer.src = "cassete/" + encodeURIComponent(track.file);
    }
    
    const targetVolume = this.isMuted ? 0 : 0.4;
    this.activePlayer.volume = targetVolume;
    this.activePlayer.play().catch(e => console.warn("Playback blocked by browser autoplay policy:", e));
    
    if (typeof this.onBgmStateChange === "function") {
      this.onBgmStateChange();
    }
  }

  stopBGM() {
    this.isPlayingBgm = false;
    if (this.activePlayer) {
      this.activePlayer.pause();
    }
    if (this.fadePlayer) {
      this.fadePlayer.pause();
      this.fadePlayer = null;
    }
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    
    if (typeof this.onBgmStateChange === "function") {
      this.onBgmStateChange();
    }
  }

  // Spotify-like smooth equal-power crossfade (3.0 seconds transition, triggered before track ends)
  crossfadeTo(newIndex) {
    if (newIndex < 0 || newIndex >= this.playlist.length) return;
    
    // Clear and finalize any active transition
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.fadePlayer) {
      this.fadePlayer.pause();
      this.fadePlayer = null;
    }
    
    this.isTransitioning = true;
    
    const oldIndex = this.currentTrackIndex;
    this.currentTrackIndex = newIndex;
    
    const newTrack = this.playlist[newIndex];
    const newSrc = "cassete/" + encodeURIComponent(newTrack.file);
    
    const nextPlayer = this.activePlayer === this.audio1 ? this.audio2 : this.audio1;
    const oldPlayer = this.activePlayer;
    
    nextPlayer.src = newSrc;
    nextPlayer.volume = 0;
    nextPlayer.currentTime = 0;
    
    this.activePlayer = nextPlayer;
    this.fadePlayer = oldPlayer;
    
    if (this.isPlayingBgm) {
      nextPlayer.play().catch(e => console.warn("Playback blocked:", e));
    }
    
    const fadeDuration = 3000; // 3.0 seconds crossfade
    const steps = 30; // 100ms per step
    const stepTime = fadeDuration / steps; 
    let currentStep = 0;
    
    const targetVolume = this.isMuted ? 0 : 0.4;
    
    this.fadeInterval = setInterval(() => {
      currentStep++;
      const fraction = currentStep / steps;
      
      // Equal-power crossfade curves (sine / cosine)
      const volFadeOut = Math.cos(fraction * Math.PI / 2) * targetVolume;
      const volFadeIn = Math.sin(fraction * Math.PI / 2) * targetVolume;
      
      if (this.activePlayer && this.isPlayingBgm) {
        this.activePlayer.volume = this.isMuted ? 0 : volFadeIn;
      }
      if (this.fadePlayer) {
        this.fadePlayer.volume = this.isMuted ? 0 : volFadeOut;
      }
      
      if (currentStep >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        
        if (this.fadePlayer) {
          this.fadePlayer.pause();
          this.fadePlayer = null;
        }
        if (this.activePlayer && this.isPlayingBgm) {
          this.activePlayer.volume = this.isMuted ? 0 : targetVolume;
        }
        this.isTransitioning = false;
      }
    }, stepTime);

    if (typeof this.onBgmStateChange === "function") {
      this.onBgmStateChange();
    }
    if (typeof this.onTrackEnd === "function") {
      this.onTrackEnd();
    }
  }

  setTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.crossfadeTo(index);
  }

  playCanDrop() {
    if (!this.ctx || this.isMuted) return;
    
    this.playTone(1200, 'sine', 0.05, 0.08);
    setTimeout(() => {
      this.playTone(1500, 'sine', 0.06, 0.08);
    }, 60);

    setTimeout(() => {
      this.playTone(220, 'triangle', 0.1, 0.1, 120);
      
      setTimeout(() => {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start();
        osc.stop(now + 0.35);
        
        this.playTone(450, 'sine', 0.15, 0.05, 100);
      }, 100);
    }, 250);
  }

  playCanOpen() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    this.playTone(800, 'triangle', 0.05, 0.1, 400);
    
    setTimeout(() => {
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(8000, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.3);
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      noise.start();
      noise.stop(this.ctx.currentTime + 0.35);
    }, 30);
  }
}

// Global Export
window.Sound = new GamifiedSoundManager();

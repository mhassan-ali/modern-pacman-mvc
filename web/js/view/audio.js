export class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        
        // Track pitches
        this.wakaState = false;
        
        // Background music loop intervals
        this.bgmInterval = null;
    }

    init() {
        if (this.ctx) return;
        // Lazily initialize on first interaction due to browser autoplay policies
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBGM();
        } else {
            this.startBGM();
        }
        return this.muted;
    }

    playOscillator(freqStart, freqEnd, type, duration, volume = 0.05) {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        }

        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playWaka() {
        this.wakaState = !this.wakaState;
        const freq = this.wakaState ? 440 : 330;
        this.playOscillator(freq, freq - 100, "triangle", 0.08, 0.07);
    }

    playPowerEat() {
        this.playOscillator(200, 800, "sawtooth", 0.2, 0.08);
    }

    playGhostEat() {
        this.playOscillator(400, 1200, "sine", 0.35, 0.12);
    }

    playDeath() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;
        this.stopBGM();

        // Multi-stage death slide
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(500, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.8);
        
        gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.9);
    }

    playWin() {
        if (this.muted) return;
        this.resume();
        if (!this.ctx) return;
        this.stopBGM();

        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playOscillator(freq, freq, "sine", 0.15, 0.06);
            }, idx * 100);
        });
    }

    startBGM() {
        if (this.muted) return;
        this.stopBGM();
        this.resume();

        let step = 0;
        // Neon-synth retro arpeggio notes
        const bassline = [110.00, 110.00, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81]; // A, C, D, E sub-bass
        
        this.bgmInterval = setInterval(() => {
            if (this.muted || !this.ctx) return;
            const freq = bassline[step % bassline.length];
            this.playOscillator(freq, freq / 2, "triangle", 0.18, 0.02);
            
            // Add a higher lead note sometimes
            if (step % 4 === 0) {
                const leadFreq = freq * 4;
                this.playOscillator(leadFreq, leadFreq, "sine", 0.12, 0.015);
            }
            step++;
        }, 240);
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

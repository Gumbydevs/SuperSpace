export class SoundManager {
    constructor() {
        // Initialize Web Audio API
        this.audioContext = null;
        this.masterGainNode = null;
        this.sounds = {};
        this.isMuted = false;
        this.thrusterSound = null;
        
        this.init();
    }
    
    init() {
        try {
            // Create AudioContext - with fallback for older browsers
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master volume control
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
            this.masterGainNode.gain.value = 0.5; // 50% volume by default
            
            // Generate all procedural sounds
            this.generateSounds();
            
            console.log('Sound system initialized successfully');
        } catch (error) {
            console.error('Web Audio API not supported or error initializing:', error);
        }
    }
    
    generateSounds() {
        // Generate all our procedural sounds instead of loading from URLs
        this.generateLaserSound();
        this.generateBurstSound();
        this.generateMissileSound();
        this.generateExplosionSound();
        this.generateHitSound();
        this.generatePowerupSound();
        console.log('All sounds generated successfully');
    }
    
    // Play a generated sound
    play(name, options = {}) {
        if (!this.audioContext || this.isMuted) return;
        
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound '${name}' not found`);
            return;
        }
        
        // Create audio source
        const source = this.audioContext.createBufferSource();
        source.buffer = sound;
        
        // Create individual gain node for this sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume || 1.0;
        
        // Connect source → gain → master gain → output
        source.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        // Spatial audio - if position provided
        if (options.position) {
            // Simple panning based on X position (left/right)
            const panner = this.audioContext.createStereoPanner();
            // Map x from [-2000, 2000] to [-1, 1] (assuming world width is 4000)
            const normalizedX = options.position.x / 2000;
            // Clamp to [-1, 1]
            panner.pan.value = Math.max(-1, Math.min(1, normalizedX));
            
            // Use the panner in the chain
            source.disconnect();
            source.connect(panner);
            panner.connect(gainNode);
        }
        
        // Set playback rate (pitch) if provided
        if (options.playbackRate) {
            source.playbackRate.value = options.playbackRate;
        }
        
        // Set loop if needed
        source.loop = !!options.loop;
        
        // Play the sound
        source.start(0);
        
        // If looping, return the source so it can be stopped later
        if (options.loop) {
            return source;
        }
    }
    
    // Start continuous thruster sound
    startThrusterSound(options = {}) {
        if (!this.audioContext || this.isMuted) return;
        
        // Stop any existing thruster sound
        this.stopThrusterSound();
        
        // Create oscillator for thruster
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 85;
        
        // Create noise for the thruster
        const noiseBuffer = this.createNoiseBuffer(1.0);
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        // Create filters for both sources
        const oscillatorFilter = this.audioContext.createBiquadFilter();
        oscillatorFilter.type = 'lowpass';
        oscillatorFilter.frequency.value = 400;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 0.5;
        
        // Create gain nodes for mixing
        const oscillatorGain = this.audioContext.createGain();
        oscillatorGain.gain.value = 0.3;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.1;
        
        // Final output gain
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = options.volume || 0.5;
        
        // Connect everything
        oscillator.connect(oscillatorFilter);
        oscillatorFilter.connect(oscillatorGain);
        oscillatorGain.connect(outputGain);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(outputGain);
        
        outputGain.connect(this.masterGainNode);
        
        // Start the sound
        oscillator.start();
        noiseSource.start();
        
        // Save references to stop them later
        this.thrusterSound = {
            oscillator,
            noiseSource, 
            outputGain
        };
        
        return this.thrusterSound;
    }
    
    stopThrusterSound() {
        if (this.thrusterSound && this.audioContext) {
            try {
                // Gradual fade out
                const now = this.audioContext.currentTime;
                
                // Check if outputGain exists before accessing
                if (this.thrusterSound.outputGain) {
                    this.thrusterSound.outputGain.gain.setValueAtTime(
                        this.thrusterSound.outputGain.gain.value, now
                    );
                    this.thrusterSound.outputGain.gain.linearRampToValueAtTime(0, now + 0.1);
                }
                
                // Stop after fade out
                setTimeout(() => {
                    if (this.thrusterSound) {
                        // Check if oscillator and noiseSource exist before stopping
                        if (this.thrusterSound.oscillator) {
                            this.thrusterSound.oscillator.stop();
                        }
                        if (this.thrusterSound.noiseSource) {
                            this.thrusterSound.noiseSource.stop();
                        }
                    }
                }, 100);
            } catch (e) {
                console.error('Error stopping thruster sound:', e);
            }
            this.thrusterSound = null;
        }
    }
    
    stopSound(source) {
        if (source && this.audioContext) {
            try {
                source.stop();
            } catch (e) {
                console.error('Error stopping sound:', e);
            }
        }
    }
    
    setMasterVolume(volume) {
        if (this.masterGainNode) {
            // Clamp volume between 0 and 1
            this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGainNode) {
            this.masterGainNode.gain.value = this.isMuted ? 0 : 0.5;
        }
        return this.isMuted;
    }
    
    // Create white noise buffer for various effects
    createNoiseBuffer(duration = 1.0) {
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    // Generate the classic SubSpace laser sound
    generateLaserSound() {
        const duration = 0.25;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // SubSpace laser had a slightly descending pitch
        const baseFreq = 1200;
        for (let i = 0; i < buffer.length; i++) {
            // Time progress (0 to 1)
            const t = i / buffer.length;
            
            // Frequency drops slightly over time
            const freq = baseFreq - 300 * t;
            
            // Amplitude envelope - quick attack, gradual decay
            const amp = t < 0.05 ? t * 20 : (1.0 - t) * 0.9 + 0.1;
            
            // Generate sine wave with frequency and amplitude modulation
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
            
            // Add a subtle higher harmonic for texture
            data[i] += 0.3 * Math.sin(i * freq * 2 / this.audioContext.sampleRate * Math.PI * 2) * amp;
        }
        
        // Add subtle noise
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            data[i] += (Math.random() * 2 - 1) * 0.05 * (1 - t);
        }
        
        // Store procedural sound
        this.sounds.laser = buffer;
    }
    
    // Generate burst cannon sound (multiple rapid pulses)
    generateBurstSound() {
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        const pulseCount = 3;
        const pulseLength = buffer.length / pulseCount;
        
        for (let p = 0; p < pulseCount; p++) {
            const startSample = Math.floor(p * pulseLength);
            const endSample = Math.floor((p + 0.8) * pulseLength); // Slight overlap
            
            const baseFreq = 950 + p * 100; // Increase pitch for each pulse
            
            for (let i = startSample; i < endSample && i < buffer.length; i++) {
                const localI = i - startSample;
                const pulseDuration = endSample - startSample;
                const t = localI / pulseDuration;
                
                // Frequency modulation
                const freq = baseFreq - 200 * t;
                
                // Amplitude envelope - quick attack, quick decay
                const amp = t < 0.1 ? t * 10 : (1 - t);
                
                const sample = Math.sin(localI * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
                data[i] += sample;
            }
        }
        
        // Normalize to avoid clipping
        const max = Math.max(...Array.from(data).map(x => Math.abs(x)));
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i] / max * 0.9;
        }
        
        // Store procedural sound
        this.sounds.burst = buffer;
    }
    
    // Generate missile sound (deeper, with whoosh)
    generateMissileSound() {
        const duration = 0.6;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Base missile launch sound - lower frequency than laser
        const baseFreq = 200;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Frequency rises slightly then falls
            const freqModulation = t < 0.3 ? t * 300 : 90 - (t - 0.3) * 200;
            const freq = baseFreq + freqModulation;
            
            // Amplitude - gradual attack, sustain, decay
            let amp = 0;
            if (t < 0.1) amp = t * 10; // Attack
            else if (t < 0.7) amp = 1.0; // Sustain
            else amp = (1 - t) * 3.33; // Decay
            
            // Base tone
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.7;
            
            // Add harmonics
            data[i] += Math.sin(i * freq * 1.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.2;
            data[i] += Math.sin(i * freq * 0.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
            
            // Add noise component (whoosh)
            const noiseFactor = t < 0.3 ? t * 3.33 : (1 - t) * 1.43;
            data[i] += (Math.random() * 2 - 1) * 0.2 * noiseFactor;
        }
        
        // Store procedural sound
        this.sounds.missile = buffer;
    }
    
    // Generate the classic SubSpace explosion sound
    generateExplosionSound() {
        const duration = 1.2;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Initial impact - short burst of noise
        for (let i = 0; i < buffer.length * 0.1; i++) {
            const t = i / (buffer.length * 0.1);
            const amp = t < 0.1 ? t * 10 : (1 - t) * 1.11;
            data[i] = (Math.random() * 2 - 1) * amp;
        }
        
        // Main explosion - filtered noise with resonant frequencies
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Amplitude envelope - quick attack, long decay
            const env = t < 0.05 ? t * 20 : Math.pow(1 - t, 1.2);
            
            // Random noise component
            const noise = Math.random() * 2 - 1;
            
            // Resonant frequencies to simulate explosion tones
            const f1 = 60;
            const f2 = 90;
            const f3 = 120;
            const f4 = 200;
            
            const tone1 = Math.sin(i * f1 / this.audioContext.sampleRate * Math.PI * 2);
            const tone2 = Math.sin(i * f2 / this.audioContext.sampleRate * Math.PI * 2);
            const tone3 = Math.sin(i * f3 / this.audioContext.sampleRate * Math.PI * 2);
            const tone4 = Math.sin(i * f4 / this.audioContext.sampleRate * Math.PI * 2);
            
            // Mix noise and tones
            const mix = noise * 0.6 + tone1 * 0.1 + tone2 * 0.1 + tone3 * 0.1 + tone4 * 0.1;
            
            // Apply envelope
            data[i] = mix * env;
            
            // Add rumble in the later part of the explosion
            if (t > 0.1) {
                const rumbleEnv = Math.pow(1 - t, 2) * 0.4;
                const rumbleFreq = 40 + Math.random() * 20;
                const rumble = Math.sin(i * rumbleFreq / this.audioContext.sampleRate * Math.PI * 2);
                data[i] += rumble * rumbleEnv;
            }
        }
        
        // Store procedural sound
        this.sounds.explosion = buffer;
    }
    
    // Generate hit sound for projectile impacts
    generateHitSound() {
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Create a metallic impact sound
        const baseFreq = 400;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Amplitude envelope - very quick attack, quick decay
            const env = t < 0.02 ? t * 50 : Math.pow(1 - t, 1.5);
            
            // Random noise component for the impact
            const noise = Math.random() * 2 - 1;
            
            // Metallic resonant frequencies
            const f1 = baseFreq;
            const f2 = baseFreq * 1.5;
            const f3 = baseFreq * 2.3;
            
            const tone1 = Math.sin(i * f1 / this.audioContext.sampleRate * Math.PI * 2);
            const tone2 = Math.sin(i * f2 / this.audioContext.sampleRate * Math.PI * 2);
            const tone3 = Math.sin(i * f3 / this.audioContext.sampleRate * Math.PI * 2);
            
            // Mix noise and tones with different weights
            const mix = noise * 0.3 + tone1 * 0.3 + tone2 * 0.25 + tone3 * 0.15;
            
            // Apply envelope
            data[i] = mix * env;
        }
        
        // Store procedural sound
        this.sounds.hit = buffer;
    }
    
    // Generate powerup collection sound
    generatePowerupSound() {
        const duration = 0.8;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // SubSpace powerups had a characteristic rising tone sequence
        const baseFreq = 300;
        const notes = [1, 1.33, 1.5, 2]; // Musical intervals for the sequence
        const noteDuration = duration / notes.length;
        
        for (let n = 0; n < notes.length; n++) {
            const freq = baseFreq * notes[n];
            const startSample = Math.floor(n * noteDuration * this.audioContext.sampleRate);
            const endSample = Math.floor((n + 1) * noteDuration * this.audioContext.sampleRate);
            
            for (let i = startSample; i < endSample; i++) {
                const t = (i - startSample) / (endSample - startSample);
                
                // Attack-decay envelope for each note
                let amp = 0;
                if (t < 0.1) amp = t * 10; // Quick attack
                else amp = 1 - (t - 0.1) * (1 / 0.9); // Gradual decay
                
                // Add the tone
                const sample = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
                
                // Add a harmonic
                const harmonic = Math.sin(i * freq * 2 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
                
                data[i] = sample + harmonic;
            }
        }
        
        // Add a subtle shimmer effect
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const shimmerFreq = 2000 + 1000 * t; // Rising high frequency
            const shimmerAmp = Math.pow(1 - t, 2) * 0.2; // Fades out
            data[i] += Math.sin(i * shimmerFreq / this.audioContext.sampleRate * Math.PI * 2) * shimmerAmp;
        }
        
        // Store procedural sound
        this.sounds.powerup = buffer;
    }
    
    // Use this method to ensure audio context is resumed after user interaction
    resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
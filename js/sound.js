export class SoundManager {
    constructor() {
        // Here we initialize core audio components
        this.audioContext = null;      // Web Audio API context
        this.masterGainNode = null;    // Master volume control
        this.sounds = {};              // Sound buffer storage
        this.isMuted = false;          // Mute state tracking
        this.thrusterSound = null;     // Reference to continuous thruster sound
        
        // Initialize the audio system
        this.init();
    }
    
    init() {
        try {
            // Here we create the core Web Audio API context
            // AudioContext allows us to generate, process and play sounds
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Here we create a master volume control
            // All game sounds will connect through this gain node
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
            this.masterGainNode.gain.value = 0.5; // 50% default volume
            
            // Here we generate all procedural sounds 
            // Instead of loading audio files, we create sounds programmatically
            this.generateSounds();
            
            console.log('Sound system initialized successfully');
        } catch (error) {
            console.error('Web Audio API not supported or error initializing:', error);
        }
    }
    
    generateSounds() {
        // Here we call methods to create each game sound
        this.generateLaserSound();
        this.generateBurstSound();
        this.generateMissileSound();
        this.generateExplosionSound();
        this.generateHitSound();
        this.generatePowerupSound();
        console.log('All sounds generated successfully');
    }
    
    // Here we play a specified sound with optional parameters
    play(name, options = {}) {
        if (!this.audioContext || this.isMuted) return;
        
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound '${name}' not found`);
            return;
        }
        
        // Here we create a sound source from the buffer
        // Each play call needs its own source
        const source = this.audioContext.createBufferSource();
        source.buffer = sound;
        
        // Here we create gain node for this individual sound's volume
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume || 1.0;
        
        // Here we connect the audio nodes in sequence
        // source → gain → master gain → output
        source.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        // Here we implement basic spatial audio if position is provided
        if (options.position) {
            // Use stereo panning based on X position (left/right)
            const panner = this.audioContext.createStereoPanner();
            // Map x from [-2000, 2000] to [-1, 1] (assuming world width)
            const normalizedX = options.position.x / 2000;
            // Clamp to the valid range of [-1, 1]
            panner.pan.value = Math.max(-1, Math.min(1, normalizedX));
            
            // Here we insert the panner in the audio node chain
            source.disconnect();
            source.connect(panner);
            panner.connect(gainNode);
        }
        
        // Here we adjust pitch if specified
        if (options.playbackRate) {
            source.playbackRate.value = options.playbackRate;
        }
        
        // Here we set looping if needed for continuous sounds
        source.loop = !!options.loop;
        
        // Start playing the sound immediately
        source.start(0);
        
        // Return the source for looping sounds so it can be stopped later
        if (options.loop) {
            return source;
        }
    }
    
    // Here we create and start the continuous thruster sound
    startThrusterSound(options = {}) {
        if (!this.audioContext || this.isMuted) return;
        
        // Stop any existing thruster sound
        this.stopThrusterSound();
        
        // Here we create an oscillator for the base thruster tone
        // Oscillators generate basic waveforms (sine, square, sawtooth)
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth'; // Harsh, engine-like sound
        oscillator.frequency.value = 85; // Low frequency for engine rumble
        
        // Here we create white noise for the thrust component
        // Noise adds realism to the mechanical thruster sound
        const noiseBuffer = this.createNoiseBuffer(1.0);
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        // Here we create filters to shape the sound
        // Filters modify the frequency content of sounds
        const oscillatorFilter = this.audioContext.createBiquadFilter();
        oscillatorFilter.type = 'lowpass';
        oscillatorFilter.frequency.value = 400; // Only keep low frequencies
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800; // Focus on mid frequencies
        noiseFilter.Q.value = 0.5; // Bandwidth of the filter
        
        // Here we create gain nodes to mix the components
        const oscillatorGain = this.audioContext.createGain();
        oscillatorGain.gain.value = 0.3; // Lower volume for oscillator
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.1; // Even lower volume for noise
        
        // Final output gain for the thruster sound
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = options.volume || 0.5;
        
        // Here we connect all the audio nodes
        oscillator.connect(oscillatorFilter);
        oscillatorFilter.connect(oscillatorGain);
        oscillatorGain.connect(outputGain);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(outputGain);
        
        outputGain.connect(this.masterGainNode);
        
        // Start both sound components
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
                // Here we implement a gradual fade out to avoid popping
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
                        // Check components before stopping
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
    
    // Here we create a white noise buffer for various sound effects
    createNoiseBuffer(duration = 1.0) {
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with random values for white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    // Here we generate a laser sound similar to classic space games
    generateLaserSound() {
        const duration = 0.25;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create a slightly descending laser pitch
        const baseFreq = 1200;
        for (let i = 0; i < buffer.length; i++) {
            // Time progress (0 to 1)
            const t = i / buffer.length;
            
            // Here we make frequency drop slightly over time
            const freq = baseFreq - 300 * t;
            
            // Amplitude envelope - quick attack, gradual decay
            const amp = t < 0.05 ? t * 20 : (1.0 - t) * 0.9 + 0.1;
            
            // Here we generate the core sine wave with frequency and amplitude
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
            
            // Add a higher harmonic for texture
            data[i] += 0.3 * Math.sin(i * freq * 2 / this.audioContext.sampleRate * Math.PI * 2) * amp;
        }
        
        // Here we add subtle noise for a more natural sound
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            data[i] += (Math.random() * 2 - 1) * 0.05 * (1 - t);
        }
        
        // Store the generated sound
        this.sounds.laser = buffer;
    }
    
    // Here we generate a burst cannon sound (multiple rapid pulses)
    generateBurstSound() {
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create multiple pulses for burst effect
        const pulseCount = 3;
        const pulseLength = buffer.length / pulseCount;
        
        for (let p = 0; p < pulseCount; p++) {
            const startSample = Math.floor(p * pulseLength);
            const endSample = Math.floor((p + 0.8) * pulseLength); // Slight overlap
            
            // Increase pitch for each pulse
            const baseFreq = 950 + p * 100;
            
            for (let i = startSample; i < endSample && i < buffer.length; i++) {
                const localI = i - startSample;
                const pulseDuration = endSample - startSample;
                const t = localI / pulseDuration;
                
                // Here we apply frequency modulation
                const freq = baseFreq - 200 * t;
                
                // Amplitude envelope - quick attack, quick decay
                const amp = t < 0.1 ? t * 10 : (1 - t);
                
                const sample = Math.sin(localI * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
                data[i] += sample;
            }
        }
        
        // Here we normalize to avoid clipping
        const max = Math.max(...Array.from(data).map(x => Math.abs(x)));
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i] / max * 0.9;
        }
        
        // Store the generated sound
        this.sounds.burst = buffer;
    }
    
    // Here we generate a missile launch sound
    generateMissileSound() {
        const duration = 0.6;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create a deeper sound than the laser for the missile
        const baseFreq = 200;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Here we make frequency rise slightly then fall
            const freqModulation = t < 0.3 ? t * 300 : 90 - (t - 0.3) * 200;
            const freq = baseFreq + freqModulation;
            
            // Amplitude - gradual attack, sustain, decay
            let amp = 0;
            if (t < 0.1) amp = t * 10; // Attack
            else if (t < 0.7) amp = 1.0; // Sustain
            else amp = (1 - t) * 3.33; // Decay
            
            // Here we generate the base tone
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.7;
            
            // Here we add harmonics for a richer sound
            data[i] += Math.sin(i * freq * 1.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.2;
            data[i] += Math.sin(i * freq * 0.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
            
            // Here we add a noise component for the "whoosh"
            const noiseFactor = t < 0.3 ? t * 3.33 : (1 - t) * 1.43;
            data[i] += (Math.random() * 2 - 1) * 0.2 * noiseFactor;
        }
        
        // Store the generated sound
        this.sounds.missile = buffer;
    }
    
    // Here we generate an explosion sound
    generateExplosionSound() {
        const duration = 1.2;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create the initial impact - short burst of noise
        for (let i = 0; i < buffer.length * 0.1; i++) {
            const t = i / (buffer.length * 0.1);
            const amp = t < 0.1 ? t * 10 : (1 - t) * 1.11;
            data[i] = (Math.random() * 2 - 1) * amp;
        }
        
        // Here we create the main explosion - filtered noise with resonances
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Amplitude envelope - quick attack, long decay
            const env = t < 0.05 ? t * 20 : Math.pow(1 - t, 1.2);
            
            // Random noise component
            const noise = Math.random() * 2 - 1;
            
            // Here we define resonant frequencies to simulate explosion tones
            const f1 = 60;
            const f2 = 90;
            const f3 = 120;
            const f4 = 200;
            
            const tone1 = Math.sin(i * f1 / this.audioContext.sampleRate * Math.PI * 2);
            const tone2 = Math.sin(i * f2 / this.audioContext.sampleRate * Math.PI * 2);
            const tone3 = Math.sin(i * f3 / this.audioContext.sampleRate * Math.PI * 2);
            const tone4 = Math.sin(i * f4 / this.audioContext.sampleRate * Math.PI * 2);
            
            // Here we mix noise and tones
            const mix = noise * 0.6 + tone1 * 0.1 + tone2 * 0.1 + tone3 * 0.1 + tone4 * 0.1;
            
            // Apply envelope
            data[i] = mix * env;
            
            // Here we add rumble in the later part of the explosion
            if (t > 0.1) {
                const rumbleEnv = Math.pow(1 - t, 2) * 0.4;
                const rumbleFreq = 40 + Math.random() * 20;
                const rumble = Math.sin(i * rumbleFreq / this.audioContext.sampleRate * Math.PI * 2);
                data[i] += rumble * rumbleEnv;
            }
        }
        
        // Store the generated sound
        this.sounds.explosion = buffer;
    }
    
    // Here we generate a hit sound for projectile impacts
    generateHitSound() {
        const duration = 0.3;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create a metallic impact sound
        const baseFreq = 400;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Amplitude envelope - very quick attack, quick decay
            const env = t < 0.02 ? t * 50 : Math.pow(1 - t, 1.5);
            
            // Random noise component for the impact
            const noise = Math.random() * 2 - 1;
            
            // Here we create metallic resonant frequencies
            const f1 = baseFreq;
            const f2 = baseFreq * 1.5;
            const f3 = baseFreq * 2.3;
            
            const tone1 = Math.sin(i * f1 / this.audioContext.sampleRate * Math.PI * 2);
            const tone2 = Math.sin(i * f2 / this.audioContext.sampleRate * Math.PI * 2);
            const tone3 = Math.sin(i * f3 / this.audioContext.sampleRate * Math.PI * 2);
            
            // Here we mix noise and tones with different weights
            const mix = noise * 0.3 + tone1 * 0.3 + tone2 * 0.25 + tone3 * 0.15;
            
            // Apply envelope
            data[i] = mix * env;
        }
        
        // Store the generated sound
        this.sounds.hit = buffer;
    }
    
    // Here we generate a powerup collection sound
    generatePowerupSound() {
        const duration = 0.8;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Here we create a rising tone sequence for powerups
        const baseFreq = 300;
        const notes = [1, 1.33, 1.5, 2]; // Musical intervals (perfect fifth, etc)
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
                
                // Here we add the main tone
                const sample = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp;
                
                // Here we add a harmonic for richness
                const harmonic = Math.sin(i * freq * 2 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
                
                data[i] = sample + harmonic;
            }
        }
        
        // Here we add a subtle shimmer effect
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const shimmerFreq = 2000 + 1000 * t; // Rising high frequency
            const shimmerAmp = Math.pow(1 - t, 2) * 0.2; // Fades out
            data[i] += Math.sin(i * shimmerFreq / this.audioContext.sampleRate * Math.PI * 2) * shimmerAmp;
        }
        
        // Store the generated sound
        this.sounds.powerup = buffer;
    }
    
    // Use this method to ensure audio context is resumed after user interaction
    // Browsers require user interaction to start audio playback
    resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
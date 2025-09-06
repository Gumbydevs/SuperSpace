export class SoundManager {
    constructor() {
        // Here we initialize core audio components
        this.audioContext = null;      // Web Audio API context
        this.masterGainNode = null;    // Master volume control
        this.sounds = {};              // Sound buffer storage
        this.isMuted = false;          // Mute state tracking
        this.thrusterSound = null;     // Reference to continuous thruster sound
        
        // Ambient music system
        this.ambientMusic = null;
        this.ambientMusicGain = null;
        
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
            
            // Initialize ambient music system
            this.initAmbientMusic();
            
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
        this.generateQuantumSound();
        this.generatePlasmaSound();
        this.generateRailgunSound();
        this.generatePulseSound();
        console.log('All sounds generated successfully');
    }
    
    // Check if a sound is loaded and available
    isSoundLoaded(name) {
        return !!this.sounds[name];
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
    
    // Update thruster sound parameters for afterburner effects
    updateThrusterSound(options = {}) {
        if (this.thrusterSound && this.audioContext && !this.isMuted) {
            try {
                const now = this.audioContext.currentTime;
                
                // Update volume if provided
                if (options.volume !== undefined && this.thrusterSound.outputGain) {
                    this.thrusterSound.outputGain.gain.setValueAtTime(
                        this.thrusterSound.outputGain.gain.value, now
                    );
                    this.thrusterSound.outputGain.gain.linearRampToValueAtTime(options.volume, now + 0.1);
                }
                
                // Update frequency for afterburner effect
                if (options.playbackRate !== undefined && this.thrusterSound.oscillator) {
                    const baseFreq = 85;
                    const newFreq = baseFreq * options.playbackRate;
                    this.thrusterSound.oscillator.frequency.setValueAtTime(
                        this.thrusterSound.oscillator.frequency.value, now
                    );
                    this.thrusterSound.oscillator.frequency.linearRampToValueAtTime(newFreq, now + 0.1);
                }
            } catch (e) {
                console.error('Error updating thruster sound:', e);
            }
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
    
    // Generate a quantum weapon sound - high-energy unstable sound
    generateQuantumSound() {
        const duration = 0.4;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // High-energy quantum weapon has an unstable, fluctuating frequency
        const baseFreq = 1800;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            
            // Create quantum fluctuations in the frequency
            const fluctuation = Math.sin(t * 80) * 200 + Math.sin(t * 55) * 100;
            const freq = baseFreq + fluctuation;
            
            // Amplitude envelope with quantum instability
            let amp = 0;
            if (t < 0.05) amp = t * 20; // Fast attack
            else if (t < 0.2) amp = 1.0; // Brief sustain
            else amp = Math.pow(1 - ((t - 0.2) / 0.8), 1.2); // Long decay
            
            // Apply quantum phase distortion for sci-fi effect
            const phase = t * 20 + Math.sin(t * 30) * 0.5;
            
            // Main carrier wave
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2 + phase) * amp * 0.6;
            
            // Higher frequency overtones for "quantum" character
            data[i] += Math.sin(i * freq * 1.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.25;
            data[i] += Math.sin(i * freq * 2.7 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.15;
            
            // Add unstable noise burst artifacts
            if (Math.random() < 0.05) {
                data[i] += (Math.random() * 2 - 1) * amp * 0.6;
            }
        }
        
        // Apply a final filter to smooth out harsh artifacts
        for (let i = 1; i < buffer.length - 1; i++) {
            data[i] = (data[i - 1] * 0.2 + data[i] * 0.6 + data[i + 1] * 0.2);
        }
        
        // Store the generated sound
        this.sounds.quantum = buffer;
    }
    
    // Generate a plasma weapon sound - hot, energy-based projectile
    generatePlasmaSound() {
        const duration = 0.6; // Increased duration for more impact
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Lower base frequency for a more powerful sound (was 600)
        const baseFreq = 280;
        
        // Create initial electrical buildup/charge sound
        for (let i = 0; i < buffer.length * 0.15; i++) {
            const t = i / (buffer.length * 0.15);
            
            // Rapidly rising frequency for charge-up
            const chargeFreq = baseFreq + t * t * 1200;
            
            // Amplitude ramps up quickly
            const amp = t * 0.6;
            
            // Add electrical charge tone with some modulation
            const phase = Math.sin(t * 80) * 0.4;
            data[i] = Math.sin(i * chargeFreq / this.audioContext.sampleRate * Math.PI * 2 + phase) * amp;
            
            // Add electrical static
            if (Math.random() < 0.3) {
                data[i] += (Math.random() * 2 - 1) * 0.3 * amp;
            }
        }
        
        // Create main plasma discharge sound
        for (let i = Math.floor(buffer.length * 0.15); i < buffer.length; i++) {
            // Remap t to 0-1 for this section
            const t = (i - buffer.length * 0.15) / (buffer.length * 0.85);
            
            // Frequency curve - starts high then decreases with fluctuations
            const fluctuation = Math.sin(t * 30) * 80;
            const freqEnvelope = Math.pow(1 - t, 0.7);
            const freq = baseFreq + freqEnvelope * 600 + fluctuation;
            
            // Powerful amplitude envelope 
            let amp = 0;
            if (t < 0.05) amp = t * 20; // Very sharp attack
            else if (t < 0.3) amp = 1.0; // Full sustain
            else amp = Math.pow(1 - ((t - 0.3) / 0.7), 1.3) * 0.9; // Gradual decay
            
            // Base tone - powerful low frequency component
            data[i] = Math.sin(i * freq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.7;
            
            // Add deeper bass frequency for power
            data[i] += Math.sin(i * (freq * 0.5) / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.5;
            
            // Add midrange harmonic for body
            data[i] += Math.sin(i * freq * 1.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
            
            // Add high frequency harmonic for sizzle
            data[i] += Math.sin(i * freq * 3.0 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.2;
            
            // Add noise for plasma "sizzle" effect
            if (t < 0.7) { // More intense sizzle in the first part
                const noiseFactor = 0.3 - t * 0.2;
                data[i] += (Math.random() * 2 - 1) * noiseFactor * amp;
            }
            
            // Add pulsing modulation for plasma energy feel
            data[i] *= 1.0 + Math.sin(t * 120) * 0.1;
        }
        
        // Apply slight distortion for more aggressive sound
        for (let i = 0; i < buffer.length; i++) {
            // Soft clipping/distortion for more edge
            if (data[i] > 0.6) data[i] = 0.6 + (data[i] - 0.6) * 0.6;
            if (data[i] < -0.6) data[i] = -0.6 + (data[i] + 0.6) * 0.6;
        }
        
        // Normalize to avoid clipping
        const max = Math.max(...Array.from(data).map(x => Math.abs(x)));
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i] / max * 0.95;
        }
        
        // Store the generated sound
        this.sounds.plasma = buffer;
    }
    
    // Generate a railgun weapon sound - electromagnetic accelerated projectile
    generateRailgunSound() {
        const duration = 0.6;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // First create the electromagnetic charging sound
        for (let i = 0; i < buffer.length * 0.3; i++) {
            const t = i / (buffer.length * 0.3);
            
            // Rising frequency for the charge-up
            const chargeFreq = 200 + t * t * 1000;
            
            // Amplitude ramps up for charge effect
            const amp = t * 0.4;
            
            // Add electrical charging tone
            data[i] = Math.sin(i * chargeFreq / this.audioContext.sampleRate * Math.PI * 2) * amp;
            
            // Add electrical hum
            const humFreq = 50 + t * 40;
            data[i] += Math.sin(i * humFreq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.5;
            
            // Add some electrical crackling noise
            if (Math.random() < t * 0.4) {
                data[i] += (Math.random() * 2 - 1) * 0.2 * amp;
            }
        }
        
        // Then create the main firing sound - powerful and sharp
        const fireStart = Math.floor(buffer.length * 0.3);
        for (let i = fireStart; i < buffer.length; i++) {
            const t = (i - fireStart) / (buffer.length - fireStart);
            
            // Amplitude envelope - extremely sharp attack, moderate decay
            const amp = t < 0.02 ? t * 50 : Math.pow(1 - t, 0.8);
            
            // Main firing sound - low frequency impact
            const mainFreq = 120 + t * 50;
            data[i] = Math.sin(i * mainFreq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.7;
            
            // Add sonic boom effect
            const boomFreq = 80;
            data[i] += Math.sin(i * boomFreq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.5;
            
            // Add high-frequency rail acceleration sound
            const railFreq = 2000 - t * 1000;
            data[i] += Math.sin(i * railFreq / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.2;
            
            // Add mechanical rattle for recoil
            if (t < 0.2) {
                const rattle = Math.sin(i * (300 + Math.random() * 200) / this.audioContext.sampleRate * Math.PI * 2) * 0.2;
                data[i] += rattle * amp;
            }
            
            // Add air disturbance noise
            data[i] += (Math.random() * 2 - 1) * amp * 0.15;
        }
        
        // Store the generated sound
        this.sounds.railgun = buffer;
    }
    
    // Generate a pulse weapon sound - rhythmic energy bursts
    generatePulseSound() {
        const duration = 0.35;
        const buffer = this.audioContext.createBuffer(
            1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate
        );
        const data = buffer.getChannelData(0);
        
        // Create pulse pattern - multiple quick energy bursts
        const pulseCount = 4;
        const pulseDuration = buffer.length / pulseCount;
        
        for (let p = 0; p < pulseCount; p++) {
            const startSample = Math.floor(p * pulseDuration);
            const endSample = Math.floor((p + 0.7) * pulseDuration); // Overlapping pulses
            
            // Each pulse increases in frequency
            const baseFreq = 800 + p * 120;
            
            for (let i = startSample; i < endSample && i < buffer.length; i++) {
                const t = (i - startSample) / (endSample - startSample);
                
                // Fast attack, fast decay envelope for each pulse
                const amp = t < 0.1 ? t * 10 : (1 - t) * 1.1;
                
                // Main pulse tone
                const sample = Math.sin((i - startSample) * baseFreq / this.audioContext.sampleRate * Math.PI * 2) * amp;
                
                // Add harmonic for richness
                const harmonic = Math.sin((i - startSample) * baseFreq * 1.5 / this.audioContext.sampleRate * Math.PI * 2) * amp * 0.3;
                
                // Add to the buffer with slight envelope for each pulse
                data[i] += (sample + harmonic) * (0.7 + 0.3 * (p / pulseCount));
            }
        }
        
        // Add subtle energy hum throughout
        const humFreq = 200;
        for (let i = 0; i < buffer.length; i++) {
            const t = i / buffer.length;
            const humAmp = 0.1 * (1 - t);
            data[i] += Math.sin(i * humFreq / this.audioContext.sampleRate * Math.PI * 2) * humAmp;
        }
        
        // Normalize to avoid clipping
        const max = Math.max(...Array.from(data).map(x => Math.abs(x)));
        for (let i = 0; i < data.length; i++) {
            data[i] = data[i] / max * 0.9;
        }
        
        // Store the generated sound
        this.sounds.pulse = buffer;
    }

    // Ambient Music System - Procedural space ambient music
    initAmbientMusic() {
        if (!this.audioContext || this.isMuted) return;

        // Music state
        this.ambientMusic = {
            active: false,
            layers: [],
            currentChord: 0,
            chordProgression: [
                [440, 523, 659], // Am chord (A4, C5, E5) - higher octave
                [349, 440, 523], // F chord (F4, A4, C5) - higher octave  
                [294, 349, 440], // Dm chord (D4, F4, A4) - higher octave
                [392, 494, 587]  // G chord (G4, B4, D5) - higher octave
            ],
            tempo: 120,
            measureLength: 6, // seconds per measure (reduced from 8)
            nextChordTime: 0,
            layerStack: [], // Track what layers are currently playing
            tensionLevel: 0, // 0-1 scale for combat tension
            lastTensionHit: 0
        };

        // Create ambient music gain node
        this.ambientMusicGain = this.audioContext.createGain();
        this.ambientMusicGain.gain.value = 0.4; // Increased from 0.15 for better audibility
        this.ambientMusicGain.connect(this.masterGainNode);
    }

    startAmbientMusic() {
        if (!this.audioContext || this.isMuted || this.ambientMusic.active) return;

        console.log('Starting ambient music system...');
        this.ambientMusic.active = true;
        this.ambientMusic.nextChordTime = this.audioContext.currentTime;
        
        // Start immediately with the first layer
        this.createAmbientLayer();
        
        // Start the ambient music loop
        this.scheduleNextAmbientLayer();
        
        console.log('Ambient music started successfully');
    }

    stopAmbientMusic() {
        if (!this.ambientMusic.active) return;
        
        this.ambientMusic.active = false;
        
        // Stop all current ambient layers
        this.ambientMusic.layers.forEach(layer => {
            if (layer.oscillator) {
                try {
                    layer.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
                    layer.oscillator.stop(this.audioContext.currentTime + 2);
                } catch (e) {
                    console.error('Error stopping ambient layer:', e);
                }
            }
        });
        
        this.ambientMusic.layers = [];
        console.log('Ambient music stopped');
    }

    scheduleNextAmbientLayer() {
        if (!this.ambientMusic.active) return;

        const now = this.audioContext.currentTime;
        
        // Schedule next chord change
        if (now >= this.ambientMusic.nextChordTime) {
            this.createAmbientLayer();
            this.ambientMusic.currentChord = (this.ambientMusic.currentChord + 1) % this.ambientMusic.chordProgression.length;
            this.ambientMusic.nextChordTime = now + this.ambientMusic.measureLength;
        }

        // Continue scheduling if music is still active
        if (this.ambientMusic.active) {
            setTimeout(() => this.scheduleNextAmbientLayer(), 1000); // Check every second
        }
    }

    createAmbientLayer() {
        if (!this.audioContext || !this.ambientMusic.active) return;

        const now = this.audioContext.currentTime;
        const chord = this.ambientMusic.chordProgression[this.ambientMusic.currentChord];
        const duration = this.ambientMusic.measureLength;

        // Determine current active layer types
        const activeLayers = this.ambientMusic.layerStack.filter(layer => 
            now < layer.endTime
        ).map(layer => layer.type);

        // Smart layer selection for cohesive music
        let selectedTypes = this.selectCohesiveLayers(activeLayers);

        selectedTypes.forEach(layerType => {
            console.log(`Creating ambient layer: ${layerType}, chord: ${this.ambientMusic.currentChord}`);
            
            switch (layerType) {
                case 'pad':
                    this.createPadLayer(chord, now, duration);
                    break;
                case 'lead':
                    this.createLeadLayer(chord, now, duration);
                    break;
                case 'bass':
                    this.createBassLayer(chord, now, duration);
                    break;
                case 'atmosphere':
                    this.createAtmosphereLayer(chord, now, duration);
                    break;
                case 'tension':
                    this.createTensionHit(chord, now);
                    break;
                case 'rhythm':
                    this.createRhythmicLayer(chord, now, duration);
                    break;
            }

            // Track this layer
            this.ambientMusic.layerStack.push({
                type: layerType,
                startTime: now,
                endTime: now + duration
            });
        });

        // Clean up old layers
        this.cleanupOldLayers(now);
    }

    selectCohesiveLayers(activeLayers) {
        const availableTypes = ['pad', 'lead', 'bass', 'atmosphere', 'tension'];
        let selectedTypes = [];

        // Always ensure we have a foundation
        if (!activeLayers.includes('pad') && !activeLayers.includes('bass')) {
            selectedTypes.push(Math.random() < 0.7 ? 'pad' : 'bass');
        }

        // Add complementary layers
        if (activeLayers.includes('pad') || selectedTypes.includes('pad')) {
            if (Math.random() < 0.4 && !activeLayers.includes('lead')) { // Reduced lead frequency
                selectedTypes.push('lead');
            }
        }

        // NO MORE RHYTHMIC ELEMENTS IN AMBIENT MUSIC - they'll only trigger during combat

        // Add atmosphere occasionally for texture
        if (Math.random() < 0.3 && !activeLayers.includes('atmosphere')) {
            selectedTypes.push('atmosphere');
        }

        // Add tension hits occasionally (but not in combat trigger)
        if (Math.random() < 0.15 && Date.now() - this.ambientMusic.lastTensionHit > 12000) { // Less frequent
            selectedTypes.push('tension');
            this.ambientMusic.lastTensionHit = Date.now();
        }

        // Ensure we're not creating too sparse music
        if (selectedTypes.length === 0 && activeLayers.length < 2) {
            selectedTypes.push('pad');
            if (Math.random() < 0.3) selectedTypes.push('lead'); // Reduced chance for lead in fallback
        }

        return selectedTypes;
    }

    createPadLayer(chord, startTime, duration) {
        const layer = { oscillators: [], gains: [] };

        // Create fuller chord by adding more voices
        const fullChord = [...chord];
        // Add octave doubling for richness
        fullChord.push(...chord.map(freq => freq * 0.5)); // Lower octave
        
        fullChord.forEach((freq, index) => {
            // Create oscillator for each note in chord
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'sawtooth';
            // Add slight detuning for chorus effect
            const detune = (Math.random() - 0.5) * 10;
            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.detune.setValueAtTime(detune, startTime);

            // Create filter for warmth
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800 + Math.random() * 400, startTime);
            filter.Q.value = 0.5;

            // Create gain with slow attack and release
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15 / fullChord.length, startTime + 3); // Slower attack
            gain.gain.setValueAtTime(0.15 / fullChord.length, startTime + duration - 3);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            // Connect audio nodes
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientMusicGain);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);

            layer.oscillators.push(oscillator);
            layer.gains.push(gain);
        });

        layer.stopTime = startTime + duration;
        this.ambientMusic.layers.push(layer);
    }

    createLeadLayer(chord, startTime, duration) {
        // Create more melodic patterns instead of random notes
        const melodyPatterns = [
            [0, 2, 1, 3], // Ascending then step back
            [2, 1, 0, 2], // Down then up
            [0, 1, 2, 1], // Simple walk up and back
            [1, 0, 2, 1]  // Neighbor tones
        ];
        
        const pattern = melodyPatterns[Math.floor(Math.random() * melodyPatterns.length)];
        const noteCount = Math.min(pattern.length, 3); // Limit to 3 notes max
        const noteDuration = duration / noteCount;

        for (let i = 0; i < noteCount; i++) {
            const noteStart = startTime + (i * noteDuration);
            const chordIndex = pattern[i] % chord.length;
            const baseFreq = chord[chordIndex] * (1 + Math.floor(Math.random() * 2)); // Max 2 octaves up

            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(baseFreq, noteStart);

            // Add subtle vibrato
            const vibrato = this.audioContext.createOscillator();
            vibrato.type = 'sine';
            vibrato.frequency.setValueAtTime(5, noteStart); // Slightly slower vibrato

            const vibratoGain = this.audioContext.createGain();
            vibratoGain.gain.setValueAtTime(8, noteStart); // Reduced pitch modulation

            vibrato.connect(vibratoGain);
            vibratoGain.connect(oscillator.frequency);

            // Create reverb-like delay
            const delay = this.audioContext.createDelay(1.0);
            delay.delayTime.setValueAtTime(0.25, noteStart);

            const delayGain = this.audioContext.createGain();
            delayGain.gain.setValueAtTime(0.2, noteStart);

            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.06, noteStart + 0.3); // Much lower volume
            gain.gain.setValueAtTime(0.06, noteStart + noteDuration - 0.5);
            gain.gain.linearRampToValueAtTime(0, noteStart + noteDuration);

        // Connect nodes
        oscillator.connect(gain);
        oscillator.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(gain);
        gain.connect(this.ambientMusicGain);
            // Connect nodes
            oscillator.connect(gain);
            oscillator.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(gain);
            gain.connect(this.ambientMusicGain);

            vibrato.start(noteStart);
            oscillator.start(noteStart);
            vibrato.stop(noteStart + noteDuration);
            oscillator.stop(noteStart + noteDuration);
        }

        const layer = {
            type: 'lead',
            stopTime: startTime + duration
        };

        this.ambientMusic.layers.push(layer);
    }

    createBassLayer(chord, startTime, duration) {
        const rootFreq = chord[0] * 0.5; // Bass octave

        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine'; // Keep sine wave but make it softer
        oscillator.frequency.setValueAtTime(rootFreq, startTime);

        // Add a low-pass filter to make it warmer and less harsh
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, startTime); // Cut high frequencies
        filter.Q.value = 0.5; // Gentle filtering

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 1.0); // Much lower volume, slower attack
        gain.gain.setValueAtTime(0.08, startTime + duration - 1);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientMusicGain);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        const layer = {
            oscillator,
            gain,
            stopTime: startTime + duration
        };

        this.ambientMusic.layers.push(layer);
    }

    createAtmosphereLayer(chord, startTime, duration) {
        // Create white noise for atmosphere
        const noiseBuffer = this.createNoiseBuffer(duration);
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        // Filter the noise to create wind-like sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200 + Math.random() * 300, startTime);
        filter.Q.value = 0.5;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.05, startTime + 2);
        gain.gain.setValueAtTime(0.05, startTime + duration - 2);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.ambientMusicGain);

        noiseSource.start(startTime);

        const layer = {
            source: noiseSource,
            gain,
            stopTime: startTime + duration
        };

        this.ambientMusic.layers.push(layer);
    }

    createTensionHit(chord, startTime) {
        // LOW FREQUENCY IMPACT (Tympani-like)
        const lowOsc = this.audioContext.createOscillator();
        lowOsc.type = 'sine';
        const baseFreq = chord[0] * 0.4; // Slightly higher than before for more audibility
        lowOsc.frequency.setValueAtTime(baseFreq, startTime);
        lowOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, startTime + 0.3);

        // MID FREQUENCY IMPACT (Body of the drum)
        const midOsc = this.audioContext.createOscillator();
        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(baseFreq * 3, startTime);
        midOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2, startTime + 0.2);

        // Create noise for impact texture with multiple layers
        const lowNoiseBuffer = this.createNoiseBuffer(1.2);
        const lowNoiseSource = this.audioContext.createBufferSource();
        lowNoiseSource.buffer = lowNoiseBuffer;

        const midNoiseBuffer = this.createNoiseBuffer(0.8);
        const midNoiseSource = this.audioContext.createBufferSource();
        midNoiseSource.buffer = midNoiseBuffer;

        // LOW NOISE FILTER
        const lowNoiseFilter = this.audioContext.createBiquadFilter();
        lowNoiseFilter.type = 'lowpass';
        lowNoiseFilter.frequency.setValueAtTime(200, startTime);
        lowNoiseFilter.Q.value = 2;

        // MID NOISE FILTER
        const midNoiseFilter = this.audioContext.createBiquadFilter();
        midNoiseFilter.type = 'bandpass';
        midNoiseFilter.frequency.setValueAtTime(600, startTime);
        midNoiseFilter.Q.value = 1.5;

        // MAIN GAIN (much louder and more prominent)
        const mainGain = this.audioContext.createGain();
        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(0.6, startTime + 0.01); // Much louder attack
        mainGain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.15);
        mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.8);

        // MID GAIN
        const midGain = this.audioContext.createGain();
        midGain.gain.setValueAtTime(0, startTime);
        midGain.gain.linearRampToValueAtTime(0.3, startTime + 0.005);
        midGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

        // LOW NOISE GAIN
        const lowNoiseGain = this.audioContext.createGain();
        lowNoiseGain.gain.setValueAtTime(0, startTime);
        lowNoiseGain.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
        lowNoiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

        // MID NOISE GAIN
        const midNoiseGain = this.audioContext.createGain();
        midNoiseGain.gain.setValueAtTime(0, startTime);
        midNoiseGain.gain.linearRampToValueAtTime(0.2, startTime + 0.005);
        midNoiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        // Connect all elements
        lowOsc.connect(mainGain);
        midOsc.connect(midGain);
        midGain.connect(mainGain);
        
        lowNoiseSource.connect(lowNoiseFilter);
        lowNoiseFilter.connect(lowNoiseGain);
        lowNoiseGain.connect(mainGain);
        
        midNoiseSource.connect(midNoiseFilter);
        midNoiseFilter.connect(midNoiseGain);
        midNoiseGain.connect(mainGain);
        
        mainGain.connect(this.ambientMusicGain);

        // Start all elements
        lowOsc.start(startTime);
        midOsc.start(startTime);
        lowNoiseSource.start(startTime);
        midNoiseSource.start(startTime);
        
        // Stop all elements
        lowOsc.stop(startTime + 1.8);
        midOsc.stop(startTime + 0.8);

        const layer = {
            type: 'tension',
            gain: mainGain,
            stopTime: startTime + 2.0
        };

        this.ambientMusic.layers.push(layer);
    }

    createRhythmicLayer(chord, startTime, duration) {
        // Create multi-layered rhythmic elements with different frequencies
        const baseFreq = chord[0];
        const pulseCount = Math.floor(duration / 2.0); // Pulse every 2 seconds
        
        const rhythmPattern = [1, 0.7, 0.5, 0.8]; // Varying intensities
        
        for (let i = 0; i < pulseCount; i++) {
            const pulseStart = startTime + (i * 2.0);
            const intensity = rhythmPattern[i % rhythmPattern.length];
            
            // LOW FREQUENCY LAYER (Bass drum-like)
            const lowOsc = this.audioContext.createOscillator();
            lowOsc.type = 'sine';
            lowOsc.frequency.setValueAtTime(baseFreq * 0.25, pulseStart);
            lowOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.125, pulseStart + 0.2);

            const lowFilter = this.audioContext.createBiquadFilter();
            lowFilter.type = 'lowpass';
            lowFilter.frequency.setValueAtTime(150, pulseStart);
            lowFilter.Q.value = 2;

            const lowGain = this.audioContext.createGain();
            lowGain.gain.setValueAtTime(0, pulseStart);
            lowGain.gain.linearRampToValueAtTime(0.25 * intensity, pulseStart + 0.01);
            lowGain.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.6);
            
            // MID FREQUENCY LAYER (Snare/clap-like)
            const midNoiseBuffer = this.createNoiseBuffer(0.3);
            const midSource = this.audioContext.createBufferSource();
            midSource.buffer = midNoiseBuffer;

            const midFilter = this.audioContext.createBiquadFilter();
            midFilter.type = 'bandpass';
            midFilter.frequency.setValueAtTime(800, pulseStart);
            midFilter.Q.value = 3;

            const midGain = this.audioContext.createGain();
            midGain.gain.setValueAtTime(0, pulseStart);
            midGain.gain.linearRampToValueAtTime(0.15 * intensity, pulseStart + 0.005);
            midGain.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.2);
            
            // HIGH FREQUENCY LAYER (Hi-hat-like)
            const highNoiseBuffer = this.createNoiseBuffer(0.15);
            const highSource = this.audioContext.createBufferSource();
            highSource.buffer = highNoiseBuffer;

            const highFilter = this.audioContext.createBiquadFilter();
            highFilter.type = 'highpass';
            highFilter.frequency.setValueAtTime(3000, pulseStart);
            highFilter.Q.value = 1;

            const highGain = this.audioContext.createGain();
            highGain.gain.setValueAtTime(0, pulseStart);
            highGain.gain.linearRampToValueAtTime(0.08 * intensity, pulseStart + 0.002);
            highGain.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.1);

            // Connect all layers
            lowOsc.connect(lowFilter);
            lowFilter.connect(lowGain);
            lowGain.connect(this.ambientMusicGain);

            midSource.connect(midFilter);
            midFilter.connect(midGain);
            midGain.connect(this.ambientMusicGain);

            highSource.connect(highFilter);
            highFilter.connect(highGain);
            highGain.connect(this.ambientMusicGain);

            // Start all elements
            lowOsc.start(pulseStart);
            lowOsc.stop(pulseStart + 0.6);
            
            midSource.start(pulseStart);
            highSource.start(pulseStart);
        }

        const layer = {
            type: 'rhythm',
            stopTime: startTime + duration
        };

        this.ambientMusic.layers.push(layer);
    }

    cleanupOldLayers(currentTime) {
        // Clean up audio layers
        this.ambientMusic.layers = this.ambientMusic.layers.filter(layer => {
            if (currentTime > layer.stopTime + 1) {
                // Layer should be cleaned up
                return false;
            }
            return true;
        });

        // Clean up layer stack tracking
        this.ambientMusic.layerStack = this.ambientMusic.layerStack.filter(layer => {
            return currentTime < layer.endTime + 1;
        });
    }

    // Method to trigger tension hits during combat
    triggerCombatTension() {
        if (!this.ambientMusic.active || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const chord = this.ambientMusic.chordProgression[this.ambientMusic.currentChord];
        
        // Only trigger if enough time has passed since last tension hit
        if (Date.now() - this.ambientMusic.lastTensionHit > 2500) {
            this.createTensionHit(chord, now);
            
            // 30% chance to add sparse rhythmic elements during combat
            if (Math.random() < 0.3) {
                this.createCombatRhythm(chord, now, 3.0); // Short 3-second rhythm burst
            }
            
            this.ambientMusic.lastTensionHit = Date.now();
            console.log('Combat tension hit triggered');
        }
    }

    // Create combat-specific rhythmic elements (sparse and impactful)
    createCombatRhythm(chord, startTime, duration) {
        const baseFreq = chord[0];
        const hitCount = 2; // Only 2 hits over 3 seconds
        
        for (let i = 0; i < hitCount; i++) {
            const hitStart = startTime + (i * 1.5); // Spread out hits
            
            // HIGH IMPACT HIT (no low frequency pulse wave!)
            const midNoiseBuffer = this.createNoiseBuffer(0.2);
            const midSource = this.audioContext.createBufferSource();
            midSource.buffer = midNoiseBuffer;

            const midFilter = this.audioContext.createBiquadFilter();
            midFilter.type = 'bandpass';
            midFilter.frequency.setValueAtTime(400, hitStart); // Mid-frequency punch
            midFilter.Q.value = 2;

            const midGain = this.audioContext.createGain();
            midGain.gain.setValueAtTime(0, hitStart);
            midGain.gain.linearRampToValueAtTime(0.15, hitStart + 0.01);
            midGain.gain.exponentialRampToValueAtTime(0.001, hitStart + 0.3);

            midSource.connect(midFilter);
            midFilter.connect(midGain);
            midGain.connect(this.ambientMusicGain);

            midSource.start(hitStart);
        }
    }

    // Use this method to ensure audio context is resumed after user interaction
    // Browsers require user interaction to start audio playback
    resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
   }

    setMusicEnabled(enabled) {
        if (this.ambientMusicGain) {
            this.ambientMusicGain.gain.value = enabled ? this._musicVolume || 0.7 : 0;
        }
        this._musicEnabled = enabled;
    }
    setMusicVolume(vol) {
        this._musicVolume = vol;
        if (this.ambientMusicGain && (this._musicEnabled === undefined || this._musicEnabled)) {
            this.ambientMusicGain.gain.value = vol;
        }
    }
    setSfxVolume(vol) {
        this._sfxVolume = vol;
        // If you use gain nodes for SFX, set their gain here. If not, use this._sfxVolume in play() calls.
    }
}
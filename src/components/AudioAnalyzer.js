class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.isInitialized = false;
        this.isListening = false;
        this.analyzeCallback = null;

        // Analysis settings
        this.fftSize = 2048; // Power of 2, affects frequency data resolution
        this.smoothingTimeConstant = 0.8; // 0-1, how much to smooth analysis data
    }

    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create analyzer node
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = this.fftSize;
            this.analyzer.smoothingTimeConstant = this.smoothingTimeConstant;

            // Connect microphone to analyzer
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyzer);

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error("Error initializing audio analyzer:", error);
            throw error;
        }
    }

    startAnalyzing(callback) {
        if (!this.isInitialized) {
            throw new Error("AudioAnalyzer must be initialized before starting analysis");
        }

        this.isListening = true;
        this.analyzeCallback = callback;
        this.analyze();
    }

    stopAnalyzing() {
        this.isListening = false;
        this.analyzeCallback = null;
    }

    analyze() {
        if (!this.isListening || !this.analyzeCallback) return;

        // Create data arrays for analysis
        const frequencyData = new Uint8Array(this.analyzer.frequencyBinCount);
        const timeData = new Uint8Array(this.analyzer.frequencyBinCount);

        // Get current audio data
        this.analyzer.getByteFrequencyData(frequencyData);
        this.analyzer.getByteTimeDomainData(timeData);

        // Calculate various audio metrics
        const metrics = {
            // Overall volume (RMS)
            volume: this.calculateRMS(timeData),

            // Frequency bands (assuming 44.1kHz sample rate)
            bands: {
                bass: this.calculateBandEnergy(frequencyData, 20, 250),
                midrange: this.calculateBandEnergy(frequencyData, 250, 2000),
                treble: this.calculateBandEnergy(frequencyData, 2000, 20000),
            },

            // Raw data for custom analysis
            frequencyData: Array.from(frequencyData),
            timeData: Array.from(timeData),

            // Additional metrics
            peakFrequency: this.findPeakFrequency(frequencyData),
            spectralCentroid: this.calculateSpectralCentroid(frequencyData),
        };

        // Send metrics to callback
        this.analyzeCallback(metrics);

        // Continue analysis loop
        requestAnimationFrame(() => this.analyze());
    }

    calculateRMS(timeData) {
        const sum = timeData.reduce((acc, val) => acc + ((val - 128) / 128) ** 2, 0);
        return Math.sqrt(sum / timeData.length);
    }

    calculateBandEnergy(frequencyData, lowFreq, highFreq) {
        const nyquist = this.audioContext.sampleRate / 2;
        const lowBin = Math.floor((lowFreq / nyquist) * frequencyData.length);
        const highBin = Math.floor((highFreq / nyquist) * frequencyData.length);

        let sum = 0;
        for (let i = lowBin; i <= highBin; i++) {
            sum += frequencyData[i];
        }
        return sum / (highBin - lowBin + 1) / 255; // Normalize to 0-1
    }

    findPeakFrequency(frequencyData) {
        const peakBin = frequencyData.indexOf(Math.max(...frequencyData));
        return (peakBin * this.audioContext.sampleRate) / (2 * frequencyData.length);
    }

    calculateSpectralCentroid(frequencyData) {
        let sum = 0;
        let weightedSum = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            const magnitude = frequencyData[i];
            sum += magnitude;
            weightedSum += magnitude * i;
        }

        return sum === 0 ? 0 : weightedSum / sum;
    }

    cleanup() {
        this.stopAnalyzing();
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

export default AudioAnalyzer;

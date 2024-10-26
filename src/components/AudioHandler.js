// audioHandler.js

export class AudioHandler {
    constructor() {
        this.audioContexts = new Map();
        this.mediaStreamSources = new Map();
        this.audioAnalyzers = new Map();
        this.isRecording = false;
    }

    async getAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter((device) => device.kind === "audioinput");
        } catch (error) {
            console.error("Error getting audio devices:", error);
            return [];
        }
    }

    async initAudioContext(deviceId) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                },
            });

            const audioContext = new AudioContext();
            const mediaStreamSource = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;

            mediaStreamSource.connect(analyser);

            this.audioContexts.set(deviceId, audioContext);
            this.mediaStreamSources.set(deviceId, mediaStreamSource);
            this.audioAnalyzers.set(deviceId, analyser);

            return analyser;
        } catch (error) {
            console.error("Error initializing audio context:", error);
            return null;
        }
    }

    getAnalyserData(deviceId) {
        const analyser = this.audioAnalyzers.get(deviceId);
        if (!analyser) return null;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    async startRecording(deviceIds) {
        if (this.isRecording) return;

        for (const deviceId of deviceIds) {
            await this.initAudioContext(deviceId);
        }
        this.isRecording = true;
    }

    stopRecording() {
        this.audioContexts.forEach((context) => {
            context.close();
        });

        this.audioContexts.clear();
        this.mediaStreamSources.clear();
        this.audioAnalyzers.clear();
        this.isRecording = false;
    }
}

// AudioWorklet processor source exported as a string constant.
// Loaded at runtime via Blob URL to avoid bundler/worker path issues.
// Downsamples from the native AudioContext sample rate to 16 kHz PCM16.
// Buffers ~100ms of audio (1600 samples at 16kHz) before sending to reduce
// message overhead and improve streaming transcription latency.

export const pcmProcessorWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._resampleBuffer = new Float32Array(0);
    this._outBuffer = new Int16Array(1600); // 100ms at 16kHz
    this._outPos = 0;
  }

  _flush() {
    if (this._outPos === 0) return;
    const copy = this._outBuffer.slice(0, this._outPos);
    this.port.postMessage(copy.buffer, [copy.buffer]);
    this._outBuffer = new Int16Array(1600);
    this._outPos = 0;
  }

  _pushSample(s) {
    const clamped = Math.max(-1, Math.min(1, s));
    this._outBuffer[this._outPos++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    if (this._outPos >= 1600) {
      this._flush();
    }
  }

  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const float32 = input[0];
    const ratio = sampleRate / 16000;

    if (ratio <= 1) {
      for (let i = 0; i < float32.length; i++) {
        this._pushSample(float32[i]);
      }
    } else {
      const prev = this._resampleBuffer;
      const merged = new Float32Array(prev.length + float32.length);
      merged.set(prev);
      merged.set(float32, prev.length);

      const outLen = Math.floor(merged.length / ratio);
      if (outLen > 0) {
        for (let i = 0; i < outLen; i++) {
          const srcIdx = Math.round(i * ratio);
          this._pushSample(merged[srcIdx]);
        }
        const consumed = Math.round(outLen * ratio);
        this._resampleBuffer = merged.slice(consumed);
      } else {
        this._resampleBuffer = merged;
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
`;

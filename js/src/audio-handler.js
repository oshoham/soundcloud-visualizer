import { AudioContext } from './utils';

class AudioHandler {
  constructor (audioParams = {}) {
    this.setAudioParams(audioParams);

    this.audioContext = new AudioContext();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.fftSize = 1024;
    this.analyser.connect(this.audioContext.destination);

    this.binCount = this.analyser.frequencyBinCount; // 512

    this.levelsCount = 16; // should be factor of 512
    this.levelBins = Math.floor(this.binCount / this.levelsCount); //number of bins in each level

    this.freqByteData = new Uint8Array(this.binCount); // data is from 0 - 256 in 512 bins. no sound is 0
    this.timeByteData = new Uint8Array(this.binCount); // data is from 0-256 for 512 bins. no sound is 128

    this.levelHistory = new Array(256).fill(0);

    this.waveData = []; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
    this.levelsData = []; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]

    this.isBeat = false;
    this.beatCutOff = 0;
    this.beatTime = 0;

    this.isPlayingAudio = false;
  }

  setAudioParams (audioParams = {}) {
    this.volSens = audioParams.volSens || 1;
    this.beatHoldTime = audioParams.beatHoldTime || 40;
    this.beatDecayRate = audioParams.beatDecayRate || 0.97;
    this.beatThreshold = audioParams.beatThreshold || 0.15;
  }

  loadAndPlayFromUrl (url) {
    return this.loadAudio(url).then((audioBuffer) => {
      this.initSourceFromBuffer(audioBuffer);
      this.playSound();
    });
  }

  loadAudio (url) {
    return new Promise((resolve, reject) => {
      var request = new XMLHttpRequest();

      request.open('GET', url, true);
      request.responseType = 'arraybuffer';

      var onDecodeSuccess = function (buffer) { resolve(buffer); };
      var onDecodeFailure = function (error) { reject(error); };

      request.onload = () => {
        this.audioContext.decodeAudioData(request.response, onDecodeSuccess, onDecodeFailure);
      };

      request.onerror = function () {
        reject(Error('Network Error'));
      };

      request.send();
    });
  }

  initSourceFromBuffer (audioBuffer) {
    this.source = this.audioContext.createBufferSource();
    this.source.connect(this.analyser);
    this.source.buffer = audioBuffer;
  }

  initSourceFromMediaElement (mediaElement) {
    this.source = this.audioContext.createMediaElementSource(mediaElement);
    this.source.connect(this.analyser);

    var setIsPlayingToTrue = () => this.isPlayingAudio = true;
    var setIsPlayingToFalse = () => this.isPlayingAudio = false;

    mediaElement.addEventListener('playing', setIsPlayingToTrue);
    mediaElement.addEventListener('pause', setIsPlayingToFalse);
    mediaElement.addEventListener('seeking', setIsPlayingToFalse);
    mediaElement.addEventListener('seeked', setIsPlayingToTrue);
  }

  playSound () {
    this.source.start(0);
    this.isPlayingAudio = true;
  }

  stopSound () {
    this.isPlayingAudio = false;
    if (this.source) {
      this.source.stop(0);
      this.source.disconnect();
    }
  }

  update () {
    var i, j;

    //GET DATA
    this.analyser.getByteFrequencyData(this.freqByteData); //<-- bar chart
    this.analyser.getByteTimeDomainData(this.timeByteData); // <-- waveform

    //normalize waveform data
    for (i = 0; i < this.binCount; i++) {
      this.waveData[i] = ((this.timeByteData[i] - 128) / 128 ) * this.volSens;
    }

    //normalize levelsData from freqByteData
    for (i = 0; i < this.levelsCount; i++) {
      let sum = 0;
      for (j = 0; j < this.levelBins; j++) {
        sum += this.freqByteData[(i * this.levelBins) + j];
      }
      this.levelsData[i] = sum / this.levelBins / 256 * this.volSens; //freqData maxs at 256

      //adjust for the fact that lower levels are percieved more quietly
      //make lower levels smaller
      //levelsData[i] *=  1 + (i/levelsCount)/2;
    }

    // stop here so we don't mess up levelHistory
    if (!this.isPlayingAudio) {
      return;
    }

    //GET AVG LEVEL
    var levelSum = 0;
    for(j = 0; j < this.levelsCount; j++) {
      levelSum += this.levelsData[j];
    }
    var level = levelSum / this.levelsCount; // normalized from 0-1

    this.levelHistory.push(level);
    this.levelHistory.shift(1);

    //BEAT DETECTION
    if (level > this.beatCutOff && level > this.beatThreshold) {
      this.isBeat = true;
      this.beatCutOff = level * 1.1;
      this.beatTime = 0;
    } else {
      this.isBeat = false;
      if (this.beatTime <= this.beatHoldTime){
        this.beatTime++;
      } else {
        this.beatCutOff *= this.beatDecayRate;
        this.beatCutOff = Math.max(this.beatCutOff, this.beatThreshold);
      }
    }
  }
}

export default AudioHandler;

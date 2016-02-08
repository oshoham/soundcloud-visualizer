import d3 from 'd3';
import {
  requestAnimationFrame,
  resizeCanvas
} from './utils';
import AudioHandler from './audio-handler';
import initSoundCloudSearchBar from './soundcloud-search';

function visualize (audioHandler) {
  var canvas = document.getElementById('canvas');
  var canvasCtx = canvas.getContext('2d');

  var colors = [
    '#351330',
    '#424254',
    '#64908A',
    '#E8CAA4',
    '#CC2A41'
  ];
  var [fillColor, strokeColor] = d3.shuffle(colors).slice(0, 2);
  var currentColors = new Set([fillColor, strokeColor]);

  function draw (time) {
    audioHandler.update();
    var isBeat = audioHandler.isBeat;
    var frequencyBins = audioHandler.freqByteData.slice(0, 500).filter(function (value, i) {
      return i % 70 === 0;
    });

    resizeCanvas(canvas);
    var width = canvas.width;
    var height = canvas.height;

    canvasCtx.clearRect(0, 0, width, height);

    if (isBeat) {
      [fillColor, strokeColor] = d3.shuffle(colors.filter(c => !currentColors.has(c))).slice(0, 2);
      currentColors = new Set([fillColor, strokeColor]);
    }

    canvasCtx.fillStyle = fillColor;
    canvasCtx.fillRect(0, 0, width, height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = strokeColor;

    var radiusScale = d3.scale.linear()
      .domain([0, d3.max(frequencyBins)])
      .range([0, 420]);

    var x = width / 2;
    var y = height / 2;
    var radius = height / 3;
    var frequency = 10;
    var amp = 0.1 * time;

    var waveAmplitude = isBeat ? 0.06 : 0.03;
    var waveFrequency = 50;
    var rotationSpeed = 0.008;
    var oscillationSpeed = 0.002;

    frequencyBins.forEach(function (frequency, i) {
      canvasCtx.beginPath();
      let radius = radiusScale(frequency);

      for (let angle = 0; angle <= 2 * Math.PI; angle += 0.001) {
        let dx = x + radius * Math.cos(angle) * (1.0 + waveAmplitude * Math.sin(angle * waveFrequency + rotationSpeed * time) * Math.sin(oscillationSpeed * time));
        let dy = y + radius * Math.sin(angle) * (1.0 + waveAmplitude * Math.sin(angle * waveFrequency + rotationSpeed * time) * Math.sin(oscillationSpeed * time));

        if (angle === 0) {
          canvasCtx.moveTo(dx, dy);
        } else {
          canvasCtx.lineTo(dx, dy);
        }
      }

      canvasCtx.stroke();
    });

    isBeat = false;

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

function clearChildren (element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function main() {
  var soundCloudClientId = '542f757c8ad6d362950b2467b26259f5';
  var search = document.getElementById('soundcloud-search');
  var input = document.getElementById('soundcloud-search-input');
  var results = document.getElementById('soundcloud-search-results');
  var player = document.getElementById('player');

  var audioHandler = new AudioHandler();
  audioHandler.initSourceFromMediaElement(player);

  function hideControls () {
    if (document.querySelector('#soundcloud-search:hover') || document.querySelector('#player:hover')) {
      return;
    }

    search.classList.add('search--fadeout');
    player.classList.add('player--fadeout');
  }

  function showControls () {
    search.classList.remove('search--fadeout');
    player.classList.remove('player--fadeout');
  }

  initSoundCloudSearchBar(input, results, soundCloudClientId, function (track) {
    audioHandler.source.mediaElement.src = track.stream_url;
    player.classList.remove('player--hidden');

    let fadeTime = 1000;
    let hideControlsTimeout = window.setTimeout(function () { hideControls(); }, fadeTime);
    window.addEventListener('mousemove', function () {
      showControls();
      window.clearTimeout(hideControlsTimeout);
      hideControlsTimeout = window.setTimeout(function () { hideControls(); }, fadeTime);
    }, false);

    window.addEventListener('keydown', function (event) {
      if (document.querySelector('#soundcloud-search-input:focus')) {
        return;
      }

      if (event.keyCode === 32) { // spacebar
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
      }
    }, false);

    visualize(audioHandler);
  });
}

main();

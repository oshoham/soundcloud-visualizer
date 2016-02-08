import Rx from 'rx';
import SoundCloudClient from './soundcloud-client';

function clearChildren (element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export default function initSoundCloudSearchBar (inputElement, resultsElement, soundCloudClientId, onTrackSelect) {
  var soundCloud = new SoundCloudClient(soundCloudClientId);

  var keyup = Rx.Observable.fromEvent(inputElement, 'input')
    .map(function (e) {
      return e.target.value; // Project the text from the input
    })
    .filter(function (text) {
      return text.length > 2 || text.length === 0;
    })
    .distinctUntilChanged(); // Only if the value has changed

  // Search soundcloud
  var searcher = keyup
    .map(function (text) {
      return text.length ? Rx.Observable.fromPromise(soundCloud.search(text)) : Rx.Observable.empty().defaultIfEmpty();
    })
    .switchLatest(); // Ensure no out of order results

  function makeTrackClickHandler (track) {
    return function () {
      clearChildren(resultsElement);
      inputElement.value = '';
      onTrackSelect(track);
    };
  }

  function createListElement (track) {
    let li = document.createElement('li');
    li.innerHTML = `
      <img class='search__results__artwork' src=${track.artwork_url} />
      <span class='search__results__title'>${track.title}</span>
    `;
    li.addEventListener('click', makeTrackClickHandler(track), false);
    return li;
  }

  searcher.subscribe(
    function (data) {
      data = data || [];
      // Append the results
      clearChildren(resultsElement);

      data.forEach(function (track) {
        resultsElement.appendChild(createListElement(track));
      });
    },
    function (error) {
      // Handle any errors
      clearChildren(resultsElement);

      var li = document.createElement('li');
      li.innerHTML = 'Error: ' + error;
      resultsElement.appendChild(li);
    }
  );
}

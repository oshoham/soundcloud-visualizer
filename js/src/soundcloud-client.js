import SC from 'soundcloud';

export default class SoundCloudClient {
  constructor (clientId) {
    this.clientId = clientId;

    SC.initialize({
      client_id: clientId
    });
  }

  getStreamUrl (trackUrl) {
    return SC.get('/resolve', { url: trackUrl }).then((sound) => {
      return `${sound.stream_url}?client_id=${this.clientId}`;
    });
  }

  search (query) {
    return SC.get('/tracks', { q: query }).then((data) => {
      return data.map((track) => {
        return Object.assign(track, { stream_url: track.stream_url + `?client_id=${this.clientId}`});
      });
    });
  }
}

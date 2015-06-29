(function() {
  window.SessionStore = {
    get: function(authType, callback) {
      var podioOAuth = localStorage.getItem('podioOAuth');
      if (podioOAuth) {
        podioOAuth = JSON.parse(podioOAuth);
      }
      callback(podioOAuth || {});
    },
    set: function(podioOAuth, authType) {
      localStorage.setItem('podioOAuth', JSON.stringify(podioOAuth));
      location.hash = "";
    }
  };
})();
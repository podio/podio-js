/***
 * This code runs after a redirect with tokens in the hash fragment
 */
(function(PodioJS, SessionStore, PlatformConfig) {

  var clientId = PlatformConfig.clientId;
  var platform = new PodioJS({ authType: 'client', clientId: clientId }, { sessionStore: SessionStore });

  // will fetch the tokens from the hash fragment
  // and store them in the sessionStore
  if (platform.isAuthenticated()) {
    window.opener.onAuthCompleted();
  } else {
    window.opener.onAuthError();
  }

  window.close();

})(PodioJS, SessionStore, PlatformConfig);

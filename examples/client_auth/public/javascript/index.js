(function(PodioJS, SessionStore, PlatformConfig, _) {

  var clientId = PlatformConfig.clientId;
  var platform = new PodioJS({ authType: 'client', clientId: clientId }, { sessionStore: SessionStore, onTokenWillRefresh: onTokenWillRefresh });

  var redirectURL = window.location.href + 'auth_popup';
  var compiledSuccess = _.template('<h1>Success!</h1><p>You are now authenticated to do API calls to Platform</p><a href="#" id="request-user">Make a /user request</a>');
  var compiledError = _.template('<h1>Error!</h1><p>There was an error during your authentication process.</p>');
  var compiledUser = _.template('<h1>Who am I?</h1><table><tr><th>Name:</th><td><%=profile.name%></td></tr><tr><th>Mail:</th><td><%=profile.mail%></td></tr></table>');

  /***
   * Open a popup and retrieve a new auth token,
   * since there is no support for refreshing
   */
  function openPopup() {
    var popup = window.open(platform.getAuthorizationURL(redirectURL), 'auth_popup');
    // give user a chance to enter a password if not signed in
    popup.focus();
  }

  /***
   * Will be called by the PlatformSDK when a token expires
   * @param callback Function, which will execute an original request with all its parameters when called
   */
  function onTokenWillRefresh(callback) {
    // methods are registered globally for the popup to call on this main window
    window.onAuthCompleted = function() {
      // the platform SDK instance from the popup has
      // received a new auth token and saved it to the store.
      // Let's retrieve it for this instance.
      platform.refreshAuthFromStore();
      callback();
    };
    window.onAuthError = function() {
      elmBody.innerHTML = compiledError();
    };

    openPopup();
  }

  /***
   * Click handler for the auth link,
   * which is displayed if we never had authenticated before
   * @param e Event
   */
  function onStartAuthClick(e) {
    var elmBody = document.body;

    platform.isAuthenticated().catch(function (err) {
        // methods are registered globally for the popup to call on this main window
      window.onAuthCompleted = function() {
        // the platform SDK instance from the popup has
        // received a new auth token and saved it to the store.
        // Let's retrieve it for this instance.
        platform.refreshAuthFromStore();

        elmBody.innerHTML = compiledSuccess();
      };
      window.onAuthError = function() {
        elmBody.innerHTML = compiledError();
      };

      openPopup();
    });
  }

  /***
   * Click handler for requesting user data, displayed when we already
   * have authenticated.
   * @param e Event
   */
  function onRequestUserClick(e) {
    var elmBody = document.body;

    platform.isAuthenticated().then(function () {
      platform.request('get', '/user/status')
      .then(function(responseData) {
        elmBody.innerHTML = compiledUser({ profile: responseData.profile });
      });
    }).catch(function () {
      elmBody.innerHTML = compiledError();
    });
  }

  // Use event delegation
  window.addEventListener('click', function(e) {
    var id = e.target.id;

    e.preventDefault();

    if (id === 'start-auth') {
      onStartAuthClick(e);
    } else if (id === 'request-user') {
      onRequestUserClick()
    }
  });

  // replace the content with a success template
  // if we had authenticated previously and auth tokens
  // are available in the store
  platform.isAuthenticated().then(function () {
    document.body.innerHTML = compiledSuccess();
  });

})(PodioJS, SessionStore, PlatformConfig, _);

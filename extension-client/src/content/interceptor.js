(function() {
  console.log("%c[FriendDiff] Network Interceptor (Fetch + XHR) active.", "color: #ff9900; font-weight: bold;");

  const TARGET_KEYWORDS = ['friendships', 'graphql', 'followers'];

  function isTargetUrl(url) {
    if (!url) return false;
    const urlStr = String(url).toLowerCase();
    // We explicitly avoid matching 'following' to avoid clobbering the Followers snapshot
    if (urlStr.includes('following')) return false;
    return TARGET_KEYWORDS.some(key => urlStr.includes(key));
  }

  function checkIsFirstPage(url) {
    if (!url) return true;
    const urlStr = String(url).toLowerCase();
    // In REST API, pagination uses ?max_id=
    // In GraphQL API, pagination uses "after": or %22after%22
    if (urlStr.includes('max_id=')) return false;
    if (urlStr.includes('after%22')) return false;
    if (urlStr.includes('"after"')) return false;
    return true; // No pagination cursor found -> it's the first page!
  }

  function extractFriends(body, url) {
    let friends = [];
    let hasNextPage = true; 
    let isFollowersList = false;
    
    if (!body) return null;

    const urlStr = String(url).toLowerCase();

    // Pattern 1: REST API
    // Ensure we are hitting the /followers/ endpoint
    if (urlStr.includes('/followers/') && body.users && Array.isArray(body.users)) {
      isFollowersList = true;
      friends = body.users.map(u => ({ id: String(u.pk || u.id), name: u.username }));
      hasNextPage = !!body.next_max_id;
    }
    // Pattern 2: GraphQL (user -> edge_followed_by)
    else if (body.data && body.data.user && body.data.user.edge_followed_by) {
      isFollowersList = true;
      const connection = body.data.user.edge_followed_by;
      if (connection.edges) {
        friends = connection.edges.map(e => ({ id: String(e.node.id), name: e.node.username }));
      }
      if (connection.page_info) {
        hasNextPage = connection.page_info.has_next_page;
      }
    }
    // Pattern 3: GraphQL (node -> edge_followed_by)
    else if (body.data && body.data.node && body.data.node.edge_followed_by) {
      isFollowersList = true;
      const connection = body.data.node.edge_followed_by;
      if (connection.edges) {
        friends = connection.edges.map(e => ({ id: String(e.node.id), name: e.node.username }));
      }
      if (connection.page_info) {
        hasNextPage = connection.page_info.has_next_page;
      }
    }

    if (!isFollowersList) {
      // Must be 'Following' list or unrecognized layout, ignore it so we don't wipe our snapshot!
      return null;
    }

    const isFirstPage = checkIsFirstPage(urlStr);

    let userId = null;
    if (urlStr.includes('/friendships/')) {
        const match = urlStr.match(/\/friendships\/(\d+)\//);
        if (match) userId = match[1];
    } else if (urlStr.includes('graphql')) {
        try {
            const urlObj = new URL(urlStr, "https://www.instagram.com");
            const vars = JSON.parse(urlObj.searchParams.get('variables') || '{}');
            if (vars.id) userId = vars.id;
        } catch(e) {}
    }

    if (friends.length > 0) {
      console.log(`%c[FriendDiff] Extracted ${friends.length} FOLLOWERS. FirstPage: ${isFirstPage}, HasNextPage: ${hasNextPage}`, "color: #00ff00; font-weight: bold;");
      window.dispatchEvent(new CustomEvent('FRIEND_DIFF_DATA', { 
        detail: { friends, hasNextPage, isFirstPage, userId } 
      }));
    }
    return { friends, hasNextPage, isFirstPage };
  }

  // --- 1. Intercept window.fetch ---
  const originalFetch = window.fetch;
  window.fetch = async function() {
    const response = await originalFetch.apply(this, arguments);
    const url = arguments[0];
    if (isTargetUrl(url)) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        extractFriends(body, String(url));
      } catch (e) {}
    }
    return response;
  };

  // --- 2. Intercept XMLHttpRequest ---
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function() {
    this.addEventListener('load', function() {
      if (isTargetUrl(this._url)) {
        try {
          const body = JSON.parse(this.responseText);
          extractFriends(body, String(this._url));
        } catch (e) {}
      }
    });
    return originalSend.apply(this, arguments);
  };

})();

/**
 * App
 * -----------------
 */

 var App = (function($) {
  'use strict';
  var yqlBase = "http://query.yahooapis.com/v1/public/yql?format=json&q=";
  var spotifyBase = "http://ws.spotify.com/search/1/album.json?q=";
  var rowTemplate = Handlebars.compile(document.getElementById("row-template").innerHTML);
  var emptyRowTemplate = Handlebars.compile(document.getElementById("empty-row-template").innerHTML);
  var ajaxQueue = $({});

  $.urlParam = function(name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
      return null;
    } else{
      return results[1] || null;
    } 
  };

  $.ajaxQueue = function( ajaxOpts ) {
      var jqXHR,
        dfd = $.Deferred(),
        promise = dfd.promise();

      // queue our ajax request
      ajaxQueue.queue( doRequest );
      // add the abort method
      promise.abort = function( statusText ) {
        // proxy abort to the jqXHR if it is active
        if ( jqXHR ) {
          return jqXHR.abort( statusText );
        }
        // if there wasn't already a jqXHR we need to remove from queue
        var queue = ajaxQueue.queue(),
          index = $.inArray( doRequest, queue );
        if ( index > -1 ) {
          queue.splice( index, 1 );
        }
        // and then reject the deferred
        dfd.rejectWith( ajaxOpts.context || ajaxOpts,
          [ promise, statusText, "" ] );
        return promise;
      };

      // run the actual query
      function doRequest( next ) {
        jqXHR = $.ajax( ajaxOpts )
          .done( dfd.resolve )
          .fail( dfd.reject )
          .then( next, next );
      }

      return promise;
  };

  var getAlbums = function(url, callback) {
    var query = "select content from html where url=\"" + url + "\" and xpath='//title | //table[@class=\"product_list\"]/tr[@style=\"height:25px;\"]/td[@class=\"productartist\"]/span/a[position()=1] | //table[@class=\"product_list\"]/tr[@style=\"height:25px;\"]/td[@class=\"producttitle\"]/a/span[@class=\"title_search_highlight\"]'";
    $.ajax({
      url: yqlBase + encodeURIComponent(query),
      dataType: "jsonp",
      jsonpCallback: "cbfunc",
      success: function(data) {
        $("#title").html(data.query.results.title);
        var artists = data.query.results.a;
        var titles = data.query.results.span;
        var albums = [];
        for (var i in artists) {
          var row = (artists[i] + " " + titles[i]).toLowerCase();
          row = row.replace(/\(.+\)/, " ");
          row = row.replace(/,|\&|\./, " ");
          row = row.replace(/\s+/, " ");
          albums.push({ 
            title: artists[i] + " - " + titles[i], 
            query: $.trim(row) 
          });
        }
        callback.call(this, albums);
      }
    });
  };

  var searchAndDisplay = function(row) {
    var query = "select * from json where url=\"" + spotifyBase + encodeURIComponent(row.query) + "\"";
    $.ajaxQueue({
      url: yqlBase + encodeURIComponent(query),
      dataType: "jsonp",
      jsonpCallback: "cbfunc",
      success: function(data) {
        if (data.query.results.json.albums) {
          var albums = $.isArray(data.query.results.json.albums) ? data.query.results.json.albums : [data.query.results.json.albums];
          $.each(albums, function(i, album) {
            album.artists = $.isArray(album.artists) ? album.artists : [album.artists];
          });
          row.albums = albums;
          $("#content").append(rowTemplate(row));
        } else {
          $("#content").append(emptyRowTemplate(row));
        }
      }
    });
  };

  var init = function() {
    var url = $.urlParam("url");
    if (url !== null) {
      getAlbums(url, function(albums) {
        for (var i in albums) {
          searchAndDisplay(albums[i]);
        }
      });
    }
  }();

})(jQuery);
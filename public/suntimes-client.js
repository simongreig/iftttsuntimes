/**
 * suntimes-client.js
 *
 * Simon Greig
 * January 2017
 */




    /**
     * onLookupClick
     *
     * Handles the click event from the main lookup button.  Calls out the server
     * get timers, lat long etc.
     */
    function onLookupClick () {
      // Reinit
      $('div#location').text("");
      $('div#map').text("");
      $('div#permalink').text("");

      var url = "/timers/"+$("#key-input").val() ;
      console.log (url);
        $.get(url, function(data, status){
            if (status == "success") {

              dataObj = JSON.parse(data);

              if (dataObj.sunrise) {
                var sunriseDate = new Date(dataObj.sunrise);
                $('div#sunrise').text(sunriseDate.toLocaleDateString() + " " + sunriseDate.toLocaleTimeString());

                var sunsetDate = new Date(dataObj.sunset);
                $('div#sunset').text(sunsetDate.toLocaleDateString() + " " + sunsetDate.toLocaleTimeString());

                console.log("document.URL : "+document.URL);
                console.log("document.location.href : "+document.location.href);
                console.log("document.location.origin : "+document.location.origin);
                console.log("document.location.hostname : "+document.location.hostname);
                console.log("document.location.host : "+document.location.host);
                console.log("document.location.pathname : "+document.location.pathname);

                var permy = document.location.origin + document.location.pathname + "?key=" + $("#key-input").val()
                $('div#permalink').html("<a href='"+permy+"'>"+permy+"</a>");

                // Reset the test buttons
                $("#test-sunrise-button").text ("Test");
                $("#test-sunset-button").text ("Test");
                $("#test-sunrise-button").removeClass ("button-pass button-fail");
                $("#test-sunset-button").removeClass ("button-pass button-fail");

                $("#postcode-button").removeClass ("button-pass button-fail");
                $("#postcode-button").text ("OK");

                $('div#key-exists').show();
                $('div#no-key').hide();
                $('#change-location-button').show();


                  var locn = {lat: dataObj.lat, lng: dataObj.long};
                  var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 16,
                    center: locn,
                    draggable: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    zoomControl: false,
                    styles: [     {         "featureType": "all",         "elementType": "geometry.stroke",         "stylers": [             {                 "hue": "#0093ff"             },             {                 "visibility": "off"             }         ]     },     {         "featureType": "all",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "on"             }         ]     },     {         "featureType": "all",         "elementType": "labels.text.fill",         "stylers": [             {                 "color": "#b4d2df"             }         ]     },     {         "featureType": "all",         "elementType": "labels.text.stroke",         "stylers": [             {                 "visibility": "off"             },             {                 "color": "#0d9fdd"             }         ]     },     {         "featureType": "administrative",         "elementType": "labels.text.fill",         "stylers": [             {                 "color": "#444444"             }         ]     },     {         "featureType": "administrative.country",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "administrative.province",         "elementType": "all",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "administrative.province",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "administrative.locality",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "administrative.neighborhood",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "administrative.land_parcel",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "landscape",         "elementType": "all",         "stylers": [             {                 "color": "#f2f2f2"             }         ]     },     {         "featureType": "landscape.man_made",         "elementType": "geometry.fill",         "stylers": [             {                 "gamma": "4.40"             },             {                 "lightness": "-70"             },             {                 "saturation": "59"             },             {                 "weight": "1.39"             },             {                 "visibility": "on"             },             {                 "color": "#005072"             }         ]     },     {         "featureType": "poi",         "elementType": "all",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "poi.business",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "poi.government",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "poi.medical",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "poi.park",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "poi.place_of_worship",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road",         "elementType": "all",         "stylers": [             {                 "saturation": -100             },             {                 "lightness": 45             }         ]     },     {         "featureType": "road.highway",         "elementType": "all",         "stylers": [             {                 "visibility": "simplified"             }         ]     },     {         "featureType": "road.highway",         "elementType": "geometry.fill",         "stylers": [             {                 "color": "#012f51"             }         ]     },     {         "featureType": "road.highway",         "elementType": "labels.icon",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.highway.controlled_access",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.arterial",         "elementType": "geometry.fill",         "stylers": [             {                 "color": "#012f51"             }         ]     },     {         "featureType": "road.arterial",         "elementType": "geometry.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.arterial",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "simplified"             }         ]     },     {         "featureType": "road.arterial",         "elementType": "labels.icon",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.local",         "elementType": "geometry.fill",         "stylers": [             {                 "color": "#012f51"             }         ]     },     {         "featureType": "road.local",         "elementType": "geometry.stroke",         "stylers": [             {                 "saturation": "11"             },             {                 "lightness": "1"             },             {                 "gamma": "3.27"             },             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.local",         "elementType": "labels.text",         "stylers": [             {                 "visibility": "on"             }         ]     },     {         "featureType": "road.local",         "elementType": "labels.text.fill",         "stylers": [             {                 "color": "#f5f5f5"             }         ]     },     {         "featureType": "road.local",         "elementType": "labels.text.stroke",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "road.local",         "elementType": "labels.icon",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "transit",         "elementType": "all",         "stylers": [             {                 "visibility": "off"             }         ]     },     {         "featureType": "water",         "elementType": "all",         "stylers": [             {                 "color": "#46bcec"             },             {                 "visibility": "on"             }         ]     },     {         "featureType": "water",         "elementType": "geometry.fill",         "stylers": [             {                 "color": "#90c6dd"             }         ]     } ]
                  });
                  var marker = new google.maps.Marker({
                    position: locn,
                    map: map,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    title: dataObj.loc
                  });

//                  $('div#location').text(dataObj.loc);

                  var contentString = '<div id="map-bubble">' +
                    '<div id="bubble-title">' + dataObj.loc + '</div>'+
                    '<div>Next sunrise: ' + sunriseDate.toLocaleDateString() + " " + sunriseDate.toLocaleTimeString() + '</div>'+
                    '<div>Next sunset: ' + sunsetDate.toLocaleDateString() + " " + sunsetDate.toLocaleTimeString() + '</div>' +
                    '</div>';


                var infowindow = new google.maps.InfoWindow({
                content: contentString
                });

                  marker.addListener('click', function() {
                    infowindow.open(map, marker);
                  });





              } else {
                $('div#key-exists').hide();
                $('div#no-key').show();
              }
            }

        });

    }


    /**
     * onPageLoad
     *
     * Handles the page load event.
     */
    function onPageLoad () {
      $('div#key-exists').hide();
      $('div#no-key').hide();
      $('#change-location-button').show();

      var parmKey = getUrlParameter ("key");
      if (parmKey) {
        $("#key-input").val(parmKey);
        onLookupClick();
      }

      /**
       * Handles the lookup button being clicked.
       */
      $("#key-lookup-button").click(function(){
        location.href = document.location.origin + document.location.pathname + "?key=" + $("#key-input").val();
//        onLookupClick();
      });


      /**
       * Handles the postcode button being clicked.
       */
      $("#postcode-button").click(function(){

        var postcode = $("#postcode-input").val();

        var url = "/add/" + $("#key-input").val() + "/" + postcode ;
        url = encodeURI(url);
        console.log (url);
          $.get(url, function(data, status){
              console.log ("#postcode-button Data: " + data + "\nStatus: " + status);
              dataObj = JSON.parse(data);

              if (dataObj.key )
              {
                 onLookupClick();
              } else {
                $("#postcode-button").addClass("button-fail");
                $("#postcode-button").text ("Fail");
              }
          });
      });

      /**
       * Handles the help panel being clicked.
       */
      $("#help").click(function(){
        $("#help-panel").slideToggle("slow");
      });

      /**
       * Handles the change location button being clicked.
       */
      $("#change-location-button").click(function(){
        $('div#no-key').show();
        $('#change-location-button').hide();
      });


      /**
       * Handles the test sunrise button being clicked.
       */
      $("#test-sunrise-button").click(function(){
        var url = "/test/sunrise/" + $("#key-input").val();
        url = encodeURI(url);
        console.log (url);
          $.get(url, function(data, status){
              console.log ("#test-sunrise-button Data: " + data + "\nStatus: " + status);
              data = JSON.parse (data);
              if (data.errors) {
                $("#test-sunrise-button").addClass("button-fail");
                $("#test-sunrise-button").text ("Fail");
              } else {
                $("#test-sunrise-button").addClass("button-pass");
                $("#test-sunrise-button").text ("Pass");
              }

          });
      });

      /**
       * Handles the test sunset button being clicked.
       */
      $("#test-sunset-button").click(function(){
        var url = "/test/sunset/" + $("#key-input").val();
        url = encodeURI(url);
        console.log (url);
          $.get(url, function(data, status){
              console.log ("#test-sunset-button Data: " + data + "\nStatus: " + status);
              data = JSON.parse (data);
              if (data.errors) {
                $("#test-sunset-button").addClass("button-fail");
                $("#test-sunset-button").text ("Fail");
              } else {
                $("#test-sunset-button").addClass("button-pass");
                $("#test-sunset-button").text ("Pass");
              }

          });
      });

    }


    $(document).ready(function(){
      onPageLoad();
    });


var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

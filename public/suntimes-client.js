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

                var permy = document.location.origin + "/index.html?key=" + $("#key-input").val();
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


                  var uluru = {lat: dataObj.lat, lng: dataObj.long};
                  var map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 15,
                    center: uluru,
                    draggable: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    zoomControl: false
                  });
                  var marker = new google.maps.Marker({
                    position: uluru,
                    map: map
                  });

                  $('div#location').text(dataObj.loc);


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
        onLookupClick();
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

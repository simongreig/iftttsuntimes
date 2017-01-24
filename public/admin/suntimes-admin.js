/**
 * suntimes-client.js
 *
 * Simon Greig
 * January 2017
 */


$(document).ready(function(){
  var url = "/map" ;
  console.log (url);
  $.get(url, function(data, status){
     if (status == "success") {
        dataObj = JSON.parse(data);
        console.log (dataObj);

        var map = new google.maps.Map(document.getElementById('map'));

        var bounds = new google.maps.LatLngBounds();
        for (i = 0; i < dataObj.length; i++) {
          var locn = {lat: dataObj[i].lat, lng: dataObj[i].long};
          bounds.extend(locn);
          var marker = new google.maps.Marker({
            position: locn,
            map: map,
            title: dataObj[i].loc
          });
        }

        //center the map to the geometric center of all markers
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds);
     }
   });
});

// Google Maps initialization functions

// Main initialization function called by the Maps API
function initMap () {
  if (document.getElementById('cameraRegistrationMap')) {
    initCameraRegistrationMap()
  }
  if (document.getElementById('incidentReportMap')) {
    initIncidentReportMap()
  }
  if (document.getElementById('dashboardIncidentMap')) {
    initDashboardIncidentMap()
  }
}

// Camera Registration Map
function initCameraRegistrationMap () {
  // Default center (will be overridden if address is geocoded)
  const defaultCenter = { lat: 40.7128, lng: -74.006 } // New York City as default

  // Create the map
  const map = new google.maps.Map(
    document.getElementById('cameraRegistrationMap'),
    {
      zoom: 15,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    }
  )

  // Create a marker that will be draggable
  const marker = new google.maps.Marker({
    position: defaultCenter,
    map: map,
    draggable: true,
    title: 'Camera Location',
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    }
  })

  // Update form fields when marker is dragged
  marker.addListener('dragend', () => {
    const position = marker.getPosition()
    document.getElementById('camera_latitude').value = position.lat()
    document.getElementById('camera_longitude').value = position.lng()
  })

  // Allow clicking on map to move marker
  map.addListener('click', event => {
    marker.setPosition(event.latLng)
    document.getElementById('camera_latitude').value = event.latLng.lat()
    document.getElementById('camera_longitude').value = event.latLng.lng()
  })

  // Initialize the address autocomplete
  const addressInput = document.getElementById('camera_address')
  if (addressInput) {
    const autocomplete = new google.maps.places.Autocomplete(addressInput)
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry || !place.geometry.location) {
        console.log('No location data for this place')
        return
      }

      // Update the map and marker
      map.setCenter(place.geometry.location)
      marker.setPosition(place.geometry.location)

      // Update form fields
      document.getElementById('camera_latitude').value =
        place.geometry.location.lat()
      document.getElementById('camera_longitude').value =
        place.geometry.location.lng()
    })
  }
}

// Incident Report Map
function initIncidentReportMap () {
  // Default center
  const defaultCenter = { lat: 40.7128, lng: -74.006 } // New York City as default

  // Create the map
  const map = new google.maps.Map(
    document.getElementById('incidentReportMap'),
    {
      zoom: 15,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    }
  )

  // Create a marker that will be draggable
  const marker = new google.maps.Marker({
    position: defaultCenter,
    map: map,
    draggable: true,
    title: 'Incident Location',
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
    }
  })

  // Update form fields when marker is dragged
  marker.addListener('dragend', () => {
    const position = marker.getPosition()
    document.getElementById('incident_latitude').value = position.lat()
    document.getElementById('incident_longitude').value = position.lng()
  })

  // Allow clicking on map to move marker
  map.addListener('click', event => {
    marker.setPosition(event.latLng)
    document.getElementById('incident_latitude').value = event.latLng.lat()
    document.getElementById('incident_longitude').value = event.latLng.lng()
  })

  // Initialize the address autocomplete
  const addressInput = document.getElementById('location_address')
  if (addressInput) {
    const autocomplete = new google.maps.places.Autocomplete(addressInput)
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry || !place.geometry.location) {
        console.log('No location data for this place')
        return
      }

      // Update the map and marker
      map.setCenter(place.geometry.location)
      marker.setPosition(place.geometry.location)

      // Update form fields
      document.getElementById('incident_latitude').value =
        place.geometry.location.lat()
      document.getElementById('incident_longitude').value =
        place.geometry.location.lng()
    })
  }
}

// Dashboard Incident Map
function initDashboardIncidentMap () {
  // Check if we have incident data
  if (typeof incidentData === 'undefined' || !incidentData.length) {
    console.log('No incident data available')
    return
  }

  // Create bounds object to fit all markers
  const bounds = new google.maps.LatLngBounds()

  // Create the map with a default center (will adjust with bounds)
  const map = new google.maps.Map(
    document.getElementById('dashboardIncidentMap'),
    {
      zoom: 12,
      center: { lat: 40.7128, lng: -74.006 }, // Will be overridden by bounds
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    }
  )

  // Info window for showing incident details
  const infoWindow = new google.maps.InfoWindow()

  // Add markers for each incident
  incidentData.forEach(incident => {
    if (incident.lat && incident.lng) {
      const position = {
        lat: parseFloat(incident.lat),
        lng: parseFloat(incident.lng)
      }

      // Create marker
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: incident.type || 'Incident',
        // Use different icons based on incident type
        icon: getMarkerIconForIncidentType(incident.type)
      })

      // Extend bounds to include this marker
      bounds.extend(position)

      // Add click listener to show info window
      marker.addListener('click', () => {
        const content = `
          <div class="info-window">
            <h5>${incident.type || 'Incident'}</h5>
            ${incident.description ? `<p>${incident.description}</p>` : ''}
            ${incident.date ? `<p>Date: ${incident.date}</p>` : ''}
            ${
              incident.id
                ? `<p><a href="/incident/${incident.id}">View Details</a></p>`
                : ''
            }
          </div>
        `
        infoWindow.setContent(content)
        infoWindow.open(map, marker)
      })
    }
  })

  // Fit the map to the bounds of all markers
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds)

    // Don't zoom in too far on small areas
    const listener = google.maps.event.addListener(map, 'idle', () => {
      if (map.getZoom() > 16) {
        map.setZoom(16)
      }
      google.maps.event.removeListener(listener)
    })
  }
}

// Helper function to get marker icon based on incident type
function getMarkerIconForIncidentType (type) {
  // Default to red marker
  let iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'

  // Customize based on incident type
  if (type) {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('theft') || lowerType.includes('burglary')) {
      iconUrl = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
    } else if (
      lowerType.includes('vandalism') ||
      lowerType.includes('property')
    ) {
      iconUrl = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
    } else if (
      lowerType.includes('violence') ||
      lowerType.includes('assault')
    ) {
      iconUrl = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
    } else if (lowerType.includes('suspicious')) {
      iconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    }
  }

  return {
    url: iconUrl,
    scaledSize: new google.maps.Size(30, 30)
  }
}

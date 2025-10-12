// Données des stations radio avec coordonnées géographiques
export const radioStationsData = [
  {
    id: "99oEZY6q",
    name: "Top Congo FM",
    country: "RDC",
    city: "Kinshasa",
    coordinates: [4.4419, 15.2663],
    stream: "https://radio.garden/api/ara/content/listen/99oEZY6q/channel.mp3",
    genre: "Musique/Variétés",
    language: "Français/Lingala",
    description: "Radio congolaise de renom qui donne la parole aux congolais"
  },
  {
    id: "Jo6CKzEH",
    name: "Radio Okapi",
    country: "RDC",
    city: "Kinshasa",
    coordinates: [4.4419, 15.2663],
    stream: "https://radio.garden/api/ara/content/listen/Jo6CKzEH/channel.mp3",
    genre: "Info/Actualités",
    language: "Français/Lingala",
    description: "Radio d'information et d'actualités"
  },
  {
    id: "9wYTkeg5",
    name: "Radio Digital Congo",
    country: "RDC",
    city: "Kinshasa",
    coordinates: [4.4419, 15.2663],
    stream: "https://radio.garden/api/ara/content/listen/9wYTkeg5/channel.mp3",
    genre: "Généraliste",
    language: "Français",
    description: "Radio généraliste avec une variété de programmes"
  },
  {
    id: "GVAFqjMC",
    name: "Rewmi FM",
    country: "Sénégal",
    city: "Dakar",
    coordinates: [14.7167, -17.4677],
    stream: "https://radio.garden/api/ara/content/listen/GVAFqjMC/channel.mp3",
    genre: "Info/Musique",
    language: "Français/Wolof",
    description: "Radio d'information et de musique sénégalaise"
  },
  {
    id: "FBqjFK6J",
    name: "Radio Dakar City",
    country: "Sénégal",
    city: "Dakar",
    coordinates: [14.7167, -17.4677],
    stream: "https://radio.garden/api/ara/content/listen/FBqjFK6J/channel.mp3",
    genre: "Musique urbaine",
    language: "Français",
    description: "Radio spécialisée dans la musique urbaine"
  },
  {
    id: "pbiwLjg8",
    name: "H24 Senegal",
    country: "Sénégal",
    city: "Dakar",
    coordinates: [14.7167, -17.4677],
    stream: "https://radio.garden/api/ara/content/listen/pbiwLjg8/channel.mp3",
    genre: "Info continue",
    language: "Français",
    description: "Radio d'information continue 24h/24"
  },
  {
    id: "BdYoSehp",
    name: "Radio Urum-Bi",
    country: "Sénégal",
    city: "Dakar",
    coordinates: [14.7167, -17.4677],
    stream: "https://radio.garden/api/ara/content/listen/BdYoSehp/channel.mp3",
    genre: "Musique traditionnelle",
    language: "Wolof",
    description: "Radio de musique traditionnelle sénégalaise"
  },
  {
    id: "8N8Gru0O",
    name: "Radio Bonne Nouvelle FM 99.6",
    country: "Cameroun",
    city: "Douala",
    coordinates: [4.0511, 9.7679],
    stream: "https://radio.garden/api/ara/content/listen/8N8Gru0O/channel.mp3",
    genre: "Religieux / Général",
    language: "Français",
    description: "Radio religieuse avec des programmes généraux"
  },
  {
    id: "xEEkHWU5",
    name: "Balla Radio",
    country: "Cameroun",
    city: "Yaoundé",
    coordinates: [3.8480, 11.5021],
    stream: "https://radio.garden/api/ara/content/listen/xEEkHWU5/channel.mp3",
    genre: "Musique",
    language: "Français",
    description: "Radio musicale camerounaise"
  },
  {
    id: "wVjn9ASB",
    name: "RVC Radio Voice of the Cross",
    country: "Cameroun",
    city: "Yaoundé",
    coordinates: [3.8480, 11.5021],
    stream: "https://radio.garden/api/ara/content/listen/wVjn9ASB/channel.mp3",
    genre: "Religieux",
    language: "Français",
    description: "Radio religieuse chrétienne"
  }
]

// Données des podcasts (simulées)
export const podcastsData = [
  {
    id: 1,
    title: "Histoire de l'Afrique",
    author: "Dr. Moussa",
    coordinates: [4.0511, 9.7679], // Douala
    duration: "45:30",
    category: "Histoire",
    description: "Découvrez l'histoire riche et fascinante de l'Afrique"
  },
  {
    id: 2,
    title: "Musique traditionnelle",
    author: "Fatou Diallo",
    coordinates: [14.7167, -17.4677], // Dakar
    duration: "32:15",
    category: "Musique",
    description: "Exploration des rythmes et mélodies traditionnelles"
  },
  {
    id: 3,
    title: "Actualités économiques",
    author: "Jean-Pierre",
    coordinates: [4.4419, 15.2663], // Kinshasa
    duration: "28:45",
    category: "Économie",
    description: "Analyse des enjeux économiques africains"
  },
  {
    id: 4,
    title: "Cuisine africaine",
    author: "Aminata",
    coordinates: [14.7167, -17.4677], // Dakar
    duration: "38:20",
    category: "Cuisine",
    description: "Recettes et traditions culinaires africaines"
  },
  {
    id: 5,
    title: "Technologie en Afrique",
    author: "Tech Team",
    coordinates: [3.8480, 11.5021], // Yaoundé
    duration: "41:15",
    category: "Technologie",
    description: "Innovation et développement technologique"
  }
]

// Données des notes vocales (simulées)
export const voiceNotesData = [
  {
    id: 1,
    title: "Mon expérience à Kinshasa",
    user: "Marie L.",
    coordinates: [4.4419, 15.2663], // Kinshasa
    duration: "2:15",
    timestamp: "2024-01-15",
    description: "Partage de mon voyage dans la capitale congolaise"
  },
  {
    id: 2,
    title: "Recette traditionnelle",
    user: "Amadou B.",
    coordinates: [14.7167, -17.4677], // Dakar
    duration: "1:45",
    timestamp: "2024-01-14",
    description: "Comment préparer le thiéboudienne authentique"
  },
  {
    id: 3,
    title: "Visite de Douala",
    user: "Sarah K.",
    coordinates: [4.0511, 9.7679], // Douala
    duration: "3:20",
    timestamp: "2024-01-13",
    description: "Découverte de la ville économique du Cameroun"
  },
  {
    id: 4,
    title: "Conseils voyage",
    user: "Pierre M.",
    coordinates: [3.8480, 11.5021], // Yaoundé
    duration: "2:50",
    timestamp: "2024-01-12",
    description: "Mes conseils pour visiter Yaoundé"
  },
  {
    id: 5,
    title: "Musique locale",
    user: "Fatou",
    coordinates: [14.7167, -17.4677], // Dakar
    duration: "1:30",
    timestamp: "2024-01-11",
    description: "Découverte des artistes sénégalais"
  }
]

// Fonctions utilitaires
export const getStationsByCity = (city) => {
  return radioStationsData.filter(station => station.city === city)
}

export const getStationsByCountry = (country) => {
  return radioStationsData.filter(station => station.country === country)
}

export const getStationsByGenre = (genre) => {
  return radioStationsData.filter(station => station.genre.includes(genre))
}

export const getPodcastsByCategory = (category) => {
  return podcastsData.filter(podcast => podcast.category === category)
}

export const getVoiceNotesByUser = (user) => {
  return voiceNotesData.filter(note => note.user === user)
}

export const searchContent = (query) => {
  const results = {
    stations: [],
    podcasts: [],
    voiceNotes: []
  }
  
  const searchTerm = query.toLowerCase()
  
  // Recherche dans les stations
  results.stations = radioStationsData.filter(station => 
    station.name.toLowerCase().includes(searchTerm) ||
    station.city.toLowerCase().includes(searchTerm) ||
    station.country.toLowerCase().includes(searchTerm) ||
    station.genre.toLowerCase().includes(searchTerm)
  )
  
  // Recherche dans les podcasts
  results.podcasts = podcastsData.filter(podcast => 
    podcast.title.toLowerCase().includes(searchTerm) ||
    podcast.author.toLowerCase().includes(searchTerm) ||
    podcast.category.toLowerCase().includes(searchTerm)
  )
  
  // Recherche dans les notes vocales
  results.voiceNotes = voiceNotesData.filter(note => 
    note.title.toLowerCase().includes(searchTerm) ||
    note.user.toLowerCase().includes(searchTerm) ||
    note.description.toLowerCase().includes(searchTerm)
  )
  
  return results
}


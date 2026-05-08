export const CITIES = [
  { name: 'Bellingham', lat: 48.7519, lng: -122.4787 },
  { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
  { name: 'Tacoma', lat: 47.2529, lng: -122.4443 },
  { name: 'Olympia', lat: 47.0379, lng: -122.9007 },
  { name: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  { name: 'Victoria', lat: 48.4284, lng: -123.3656 },
]

export const CITY_NAMES = CITIES.map(c => c.name)

export const DEFAULT_CITY = CITIES[0]

export const getCityCoords = (cityName: string) =>
  CITIES.find(c => c.name === cityName) ?? DEFAULT_CITY

export const POPULAR_INTERESTS = [
  'music', 'hiking', 'coffee', 'food', 'fitness', 'art', 'tech', 'travel',
  'running', 'yoga', 'gaming', 'photography', 'cooking', 'nightlife',
  'startups', 'design', 'film', 'reading', 'sports', 'dancing',
  'networking', 'outdoors', 'wellness', 'volunteering',
]

export const ALL_INTERESTS = [
  'music', 'live music', 'concerts', 'festivals', 'dj', 'electronic', 'hip hop',
  'jazz', 'classical', 'indie', 'rock', 'r&b', 'pop', 'rap', 'karaoke',
  'film', 'movies', 'theatre', 'comedy', 'stand-up', 'podcasts', 'art',
  'photography', 'painting', 'drawing', 'ceramics', 'sculpture', 'fashion',
  'style', 'design', 'architecture', 'writing', 'poetry', 'books', 'reading',
  'history', 'museums',
  'food', 'coffee', 'wine', 'beer', 'cocktails', 'cooking', 'baking',
  'brunch', 'restaurants', 'street food', 'vegan', 'vegetarian', 'craft beer',
  'whiskey', 'tea',
  'fitness', 'running', 'gym', 'yoga', 'pilates', 'cycling', 'swimming',
  'rock climbing', 'martial arts', 'boxing', 'crossfit', 'wellness',
  'meditation', 'mental health', 'nutrition', 'dancing', 'salsa', 'bachata',
  'mindfulness',
  'outdoors', 'hiking', 'camping', 'surfing', 'skiing', 'snowboarding',
  'kayaking', 'travel', 'adventure', 'nature', 'gardening', 'birdwatching',
  'sustainability',
  'tech', 'startups', 'ai', 'crypto', 'coding', 'ux', 'product',
  'entrepreneurship', 'investing', 'web3', 'gaming', 'esports', 'science',
  'sports', 'football', 'basketball', 'soccer', 'tennis', 'golf', 'baseball',
  'hockey', 'volleyball', 'f1', 'motorsports', 'mma',
  'networking', 'volunteering', 'activism', 'community', 'nightlife',
  'parties', 'self-improvement', 'astrology', 'spirituality', 'languages',
  'pets', 'dogs', 'marketing', 'business',
]

export const EVENT_CATEGORIES = [
  'Music', 'DJ & Electronic', 'Hip Hop & R&B', 'Jazz & Blues', 'Live Concerts & Festivals',
  'Fitness', 'Yoga & Pilates', 'Running & Cycling', 'Climbing & Hiking', 'Combat Sports & CrossFit',
  'Food & Drink', 'Coffee & Brunch', 'Wine & Cocktails', 'Cooking & Culinary', 'Street Food & Markets',
  'Tech & Coding', 'Startups & Entrepreneurship', 'AI & Innovation', 'Gaming & Esports', 'Web3 & Crypto',
  'Outdoors & Adventure', 'Hiking & Camping', 'Water Sports', 'Snow Sports',
  'Arts & Culture', 'Photography & Film', 'Theatre & Comedy', 'Fashion & Style', 'Literature & Writing',
  'Social & Parties', 'Nightlife', 'Networking', 'Business & Finance',
  'Wellness & Mindfulness', 'Dance & Movement', 'Spirituality', 'Volunteering & Activism',
  'Education & Workshops', 'Sports & Recreation', 'Pets & Animals', 'Science & Innovation',
  'Markets & Pop-ups',
]

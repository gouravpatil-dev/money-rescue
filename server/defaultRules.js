const DEFAULT_RULES = [
  { pattern: 'swiggy|zomato|eatsure', category: 'Food', priority: 5 },
  { pattern: 'restaurant|cafe|dine|bakery|dominos|pizza|mcdonald|kfc|starbucks', category: 'Food', priority: 4 },
  { pattern: 'bigbasket|grofers|blinkit|zepto|dmart|grocery|instamart', category: 'Food', priority: 4 },
  { pattern: 'netflix|hotstar|prime video|spotify|sonyliv|zee5|jiocinema', category: 'Subscriptions', priority: 6 },
  { pattern: 'uber|ola|rapido|metro|irctc|fuel|petrol|diesel|parking|fastag', category: 'Transport', priority: 5 },
  { pattern: 'electricity|mseb|bses|water bill|broadband|airtel|jio|vodafone|vi bill|gas bill|internet', category: 'Bills', priority: 5 },
  { pattern: 'rent|landlord', category: 'Bills', priority: 5 },
  { pattern: 'amazon|flipkart|myntra|ajio|nykaa', category: 'Shopping', priority: 4 },
  { pattern: 'pvr|inox|bookmyshow|movie|cinema', category: 'Entertainment', priority: 5 },
  { pattern: 'hospital|pharmacy|clinic|medical|apollo|diagnostic', category: 'Healthcare', priority: 5 },
  { pattern: 'udemy|coursera|tuition|college|exam fee|book store', category: 'Education', priority: 5 },
  { pattern: 'makemytrip|goibibo|indigo|airlines|hotel|oyo|airbnb', category: 'Travel', priority: 5 },
  { pattern: 'mutual fund|sip|zerodha|groww|upstox|stocks|nps', category: 'Investments', priority: 6 },
];

const DEFAULT_CATEGORIES = ['Food','Entertainment','Bills','Shopping','Transport','Healthcare','Education','Travel','Subscriptions','Investments','Other'];

module.exports = { DEFAULT_RULES, DEFAULT_CATEGORIES };

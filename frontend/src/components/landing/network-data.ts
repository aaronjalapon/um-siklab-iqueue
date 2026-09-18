export type NetworkMode = "pilot" | "asean-concept";
export type NetworkFilter = "all" | "philippines" | "cross-border";

export type NetworkHub = {
  id: string;
  name: string;
  country: string;
  terminal: string;
  coordinates: [number, number];
  region: "pilot" | "philippines" | "asean";
  description: string;
  bookableOrigin?: string;
};

export type NetworkRoute = {
  id: string;
  from: string;
  to: string;
  category: "pilot" | "philippines" | "cross-border";
};

export const PILOT_HUBS: NetworkHub[] = [
  {
    id: "davao-city",
    name: "Davao City",
    country: "Philippines",
    terminal: "Davao demonstration terminal",
    coordinates: [125.6128, 7.0707],
    region: "pilot",
    description: "The central origin for the current booking, seat-allocation, and gate-verification demonstration.",
    bookableOrigin: "Davao City",
  },
  {
    id: "cagayan-de-oro",
    name: "Cagayan de Oro",
    country: "Philippines",
    terminal: "Cagayan de Oro demonstration terminal",
    coordinates: [124.6319, 8.4542],
    region: "pilot",
    description: "A modeled northern Mindanao corridor connected to Davao and Iligan in the prototype.",
    bookableOrigin: "Cagayan de Oro",
  },
  {
    id: "cotabato-city",
    name: "Cotabato City",
    country: "Philippines",
    terminal: "Cotabato demonstration terminal",
    coordinates: [124.246, 7.2236],
    region: "pilot",
    description: "A modeled western corridor connecting the Davao and Zamboanga demonstration routes.",
    bookableOrigin: "Cotabato City",
  },
  {
    id: "general-santos",
    name: "General Santos",
    country: "Philippines",
    terminal: "General Santos demonstration terminal",
    coordinates: [125.1716, 6.1164],
    region: "pilot",
    description: "A southern Mindanao destination represented in the passenger booking demonstration.",
    bookableOrigin: "General Santos",
  },
  {
    id: "butuan-city",
    name: "Butuan City",
    country: "Philippines",
    terminal: "Butuan demonstration terminal",
    coordinates: [125.5431, 8.9475],
    region: "pilot",
    description: "A modeled northeastern connection used to demonstrate route coverage and capacity scenarios.",
    bookableOrigin: "Butuan City",
  },
  {
    id: "iligan-city",
    name: "Iligan City",
    country: "Philippines",
    terminal: "Iligan demonstration terminal",
    coordinates: [124.2452, 8.228],
    region: "pilot",
    description: "A local demonstration corridor paired with Cagayan de Oro in the booking dataset.",
    bookableOrigin: "Iligan City",
  },
  {
    id: "zamboanga-city",
    name: "Zamboanga City",
    country: "Philippines",
    terminal: "Zamboanga demonstration terminal",
    coordinates: [122.079, 6.9214],
    region: "pilot",
    description: "The western edge of the modeled network, linked to Cotabato in the prototype dataset.",
    bookableOrigin: "Zamboanga City",
  },
];

export const PILOT_ROUTES: NetworkRoute[] = [
  { id: "dvo-cdo", from: "davao-city", to: "cagayan-de-oro", category: "pilot" },
  { id: "dvo-cot", from: "davao-city", to: "cotabato-city", category: "pilot" },
  { id: "dvo-gen", from: "davao-city", to: "general-santos", category: "pilot" },
  { id: "cdo-ili", from: "cagayan-de-oro", to: "iligan-city", category: "pilot" },
  { id: "dvo-but", from: "davao-city", to: "butuan-city", category: "pilot" },
  { id: "cot-zam", from: "cotabato-city", to: "zamboanga-city", category: "pilot" },
];

export const ASEAN_HUBS: NetworkHub[] = [
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    terminal: "Illustrative regional hub",
    coordinates: [120.9842, 14.5995],
    region: "philippines",
    description: "A concept gateway representing connections between Luzon, the Visayas, Mindanao, and mainland ASEAN.",
  },
  {
    id: "cebu",
    name: "Cebu",
    country: "Philippines",
    terminal: "Illustrative regional hub",
    coordinates: [123.8854, 10.3157],
    region: "philippines",
    description: "A concept inter-island node for exploring how regional journeys could connect across the network.",
  },
  {
    id: "davao",
    name: "Davao",
    country: "Philippines",
    terminal: "Illustrative regional hub",
    coordinates: [125.6128, 7.0707],
    region: "philippines",
    description: "A concept Mindanao gateway extending the pilot story toward a broader Southeast Asian network.",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    terminal: "Illustrative regional hub",
    coordinates: [101.6869, 3.139],
    region: "asean",
    description: "A concept mainland interchange connecting Malaysia with Singapore, Indonesia, and Vietnam.",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    terminal: "Illustrative regional hub",
    coordinates: [103.8198, 1.3521],
    region: "asean",
    description: "A concept cross-border hub representing high-frequency regional coach connections.",
  },
  {
    id: "ho-chi-minh-city",
    name: "Ho Chi Minh City",
    country: "Vietnam",
    terminal: "Illustrative regional hub",
    coordinates: [106.6297, 10.8231],
    region: "asean",
    description: "A concept mainland terminal linking Vietnam to Malaysia, Singapore, and the Philippines.",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    terminal: "Illustrative regional hub",
    coordinates: [106.8456, -6.2088],
    region: "asean",
    description: "A concept Indonesian hub showing how long-distance regional corridors could be coordinated.",
  },
];

export const ASEAN_ROUTES: NetworkRoute[] = [
  { id: "mnl-ceb", from: "manila", to: "cebu", category: "philippines" },
  { id: "ceb-dvo", from: "cebu", to: "davao", category: "philippines" },
  { id: "mnl-dvo", from: "manila", to: "davao", category: "philippines" },
  { id: "kl-sin", from: "kuala-lumpur", to: "singapore", category: "cross-border" },
  { id: "kl-jkt", from: "kuala-lumpur", to: "jakarta", category: "cross-border" },
  { id: "hcm-kl", from: "ho-chi-minh-city", to: "kuala-lumpur", category: "cross-border" },
  { id: "sin-jkt", from: "singapore", to: "jakarta", category: "cross-border" },
  { id: "hcm-sin", from: "ho-chi-minh-city", to: "singapore", category: "cross-border" },
  { id: "mnl-hcm", from: "manila", to: "ho-chi-minh-city", category: "cross-border" },
];

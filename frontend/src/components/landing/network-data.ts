export type NetworkMode = "philippines" | "asean";

export type NetworkFilter =
  | "all"
  | "luzon"
  | "visayas"
  | "mindanao"
  | "philippines"
  | "cross-border";

export type NetworkHub = {
  id: string;
  name: string;
  country: string;
  terminal: string;
  coordinates: [number, number];
  region: "luzon" | "visayas" | "mindanao" | "philippines" | "asean";
  description: string;
  bookableOrigin?: string;
};

export type NetworkRoute = {
  id: string;
  from: string;
  to: string;
  category: "luzon" | "visayas" | "mindanao" | "philippines" | "cross-border";
};

export const PHILIPPINE_HUBS: NetworkHub[] = [
  // Luzon
  {
    id: "baguio",
    name: "Baguio City",
    country: "Philippines",
    terminal: "Gov. Pack Road Bus Terminal",
    coordinates: [120.596, 16.4023],
    region: "luzon",
    description: "Northern Luzon highland hub serving Cordillera express bus lines along the TPLEX corridor.",
    bookableOrigin: "Baguio City",
  },
  {
    id: "manila",
    name: "Metro Manila",
    country: "Philippines",
    terminal: "Parañaque Integrated Terminal Exchange (PITX)",
    coordinates: [120.9922, 14.5098],
    region: "luzon",
    description: "The primary integrated gateway connecting Luzon provincial routes with Visayas and Mindanao RoRo lines.",
    bookableOrigin: "Manila",
  },
  {
    id: "batangas",
    name: "Batangas City",
    country: "Philippines",
    terminal: "Batangas Grand Terminal",
    coordinates: [121.0583, 13.7565],
    region: "luzon",
    description: "Southern Tagalog arterial port terminal linking road coach transit with Mindoro and Western Visayas RoRo routes.",
    bookableOrigin: "Batangas City",
  },
  {
    id: "naga",
    name: "Naga City",
    country: "Philippines",
    terminal: "Bicol Central Station",
    coordinates: [123.1854, 13.6218],
    region: "luzon",
    description: "Bicol Peninsula transport hub on the Pan-Philippine Highway (AH26) connecting Southern Luzon to Eastern Visayas.",
    bookableOrigin: "Naga City",
  },

  // Visayas
  {
    id: "iloilo",
    name: "Iloilo City",
    country: "Philippines",
    terminal: "Tagbak Integrated Bus Terminal",
    coordinates: [122.5644, 10.7202],
    region: "visayas",
    description: "Western Visayas transport gateway connecting Panay Island routes and Negros ferry-bus connections.",
    bookableOrigin: "Iloilo City",
  },
  {
    id: "bacolod",
    name: "Bacolod City",
    country: "Philippines",
    terminal: "Bacolod South Transport Terminal",
    coordinates: [122.9509, 10.6765],
    region: "visayas",
    description: "Negros Occidental bus terminal coordinating island routes with links across to Cebu Province.",
    bookableOrigin: "Bacolod City",
  },
  {
    id: "cebu",
    name: "Cebu City",
    country: "Philippines",
    terminal: "Cebu South Bus Terminal (CSBT)",
    coordinates: [123.8967, 10.2982],
    region: "visayas",
    description: "Central Visayas central hub managing high-density regional routes and inter-island passenger ferries.",
    bookableOrigin: "Cebu",
  },
  {
    id: "tacloban",
    name: "Tacloban City",
    country: "Philippines",
    terminal: "Tacloban New Bus Terminal (Abucay)",
    coordinates: [124.9856, 11.2444],
    region: "visayas",
    description: "Eastern Visayas strategic corridor on the AH26 linking Samar and Leyte with Luzon and Mindanao ferry crossings.",
    bookableOrigin: "Tacloban City",
  },

  // Mindanao
  {
    id: "cagayan-de-oro",
    name: "Cagayan de Oro",
    country: "Philippines",
    terminal: "Agora Integrated Bus Terminal",
    coordinates: [124.6547, 8.4878],
    region: "mindanao",
    description: "Northern Mindanao logistics and passenger hub connecting Davao, Bukidnon, Caraga, and Zamboanga.",
    bookableOrigin: "Cagayan de Oro",
  },
  {
    id: "butuan-city",
    name: "Butuan City",
    country: "Philippines",
    terminal: "Butuan Integrated Bus Terminal (Langihan)",
    coordinates: [125.5431, 8.9475],
    region: "mindanao",
    description: "Caraga Region hub linking northern Mindanao with Surigao ferry ports toward Leyte and the Visayas.",
    bookableOrigin: "Butuan City",
  },
  {
    id: "davao-city",
    name: "Davao City",
    country: "Philippines",
    terminal: "Davao City Overland Transport Terminal (Ecoland)",
    coordinates: [125.6022, 7.0544],
    region: "mindanao",
    description: "The primary origin for the current booking, seat-allocation, and gate-verification demonstration.",
    bookableOrigin: "Davao City",
  },
  {
    id: "general-santos",
    name: "General Santos",
    country: "Philippines",
    terminal: "Bulaong Bus Terminal",
    coordinates: [125.1716, 6.1164],
    region: "mindanao",
    description: "SOCCSKSARGEN southern terminal serving passenger traffic across South Cotabato and Sarangani.",
    bookableOrigin: "General Santos",
  },
  {
    id: "zamboanga-city",
    name: "Zamboanga City",
    country: "Philippines",
    terminal: "Zamboanga Integrated Bus Terminal (Divisoria)",
    coordinates: [122.079, 6.9214],
    region: "mindanao",
    description: "Zamboanga Peninsula western coastal terminal linked across Pagadian to Cagayan de Oro.",
    bookableOrigin: "Zamboanga City",
  },
];

export const PHILIPPINE_ROUTES: NetworkRoute[] = [
  // Luzon corridors
  { id: "bag-mnl", from: "baguio", to: "manila", category: "luzon" },
  { id: "mnl-bat", from: "manila", to: "batangas", category: "luzon" },
  { id: "mnl-nag", from: "manila", to: "naga", category: "luzon" },
  { id: "bat-nag", from: "batangas", to: "naga", category: "luzon" },

  // Visayas corridors
  { id: "ilo-bcd", from: "iloilo", to: "bacolod", category: "visayas" },
  { id: "bcd-ceb", from: "bacolod", to: "cebu", category: "visayas" },
  { id: "ceb-tac", from: "cebu", to: "tacloban", category: "visayas" },

  // Inter-island AH26 / RoRo connections
  { id: "nag-tac", from: "naga", to: "tacloban", category: "philippines" },
  { id: "tac-but", from: "tacloban", to: "butuan-city", category: "philippines" },
  { id: "ceb-cdo", from: "cebu", to: "cagayan-de-oro", category: "philippines" },

  // Mindanao corridors
  { id: "cdo-dvo", from: "cagayan-de-oro", to: "davao-city", category: "mindanao" },
  { id: "dvo-gen", from: "davao-city", to: "general-santos", category: "mindanao" },
  { id: "dvo-but", from: "davao-city", to: "butuan-city", category: "mindanao" },
  { id: "cdo-but", from: "cagayan-de-oro", to: "butuan-city", category: "mindanao" },
  { id: "cdo-zam", from: "cagayan-de-oro", to: "zamboanga-city", category: "mindanao" },
];

export const ASEAN_HUBS: NetworkHub[] = [
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    terminal: "Parañaque Integrated Terminal Exchange (PITX)",
    coordinates: [120.9922, 14.5098],
    region: "philippines",
    description: "A concept gateway representing international bus and coach transfers across ASEAN corridors.",
  },
  {
    id: "cebu",
    name: "Cebu",
    country: "Philippines",
    terminal: "Cebu South Bus Terminal (CSBT)",
    coordinates: [123.8967, 10.2982],
    region: "philippines",
    description: "A concept inter-island node for exploring how regional journeys could connect across the network.",
  },
  {
    id: "davao",
    name: "Davao",
    country: "Philippines",
    terminal: "Davao City Overland Transport Terminal (Ecoland)",
    coordinates: [125.6022, 7.0544],
    region: "philippines",
    description: "A concept southern gateway extending Philippine transit toward cross-border ASEAN connections.",
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    terminal: "Bangkok Bus Terminal (Mo Chit 2)",
    coordinates: [100.5513, 13.8136],
    region: "asean",
    description: "Mainland ASEAN hub connecting Thailand with Malaysia, Vietnam, and regional overland networks.",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    terminal: "Terminal Bersepadu Selatan (TBS)",
    coordinates: [101.7107, 3.0728],
    region: "asean",
    description: "A premier mainland interchange connecting Malaysia with Singapore, Thailand, and Indonesia.",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    terminal: "Woodlands Integrated Transport Hub",
    coordinates: [103.7712, 1.436],
    region: "asean",
    description: "A concept cross-border hub representing high-frequency regional coach connections.",
  },
  {
    id: "ho-chi-minh-city",
    name: "Ho Chi Minh City",
    country: "Vietnam",
    terminal: "Mien Dong New Bus Station",
    coordinates: [106.7118, 10.8143],
    region: "asean",
    description: "A concept mainland terminal linking Vietnam to Cambodia, Thailand, and the Philippines.",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    terminal: "Pulo Gebang Integrated Bus Terminal",
    coordinates: [106.9536, -6.2125],
    region: "asean",
    description: "A concept Indonesian hub showing how long-distance inter-island corridors could be coordinated.",
  },
];

export const ASEAN_ROUTES: NetworkRoute[] = [
  { id: "mnl-ceb", from: "manila", to: "cebu", category: "philippines" },
  { id: "ceb-dvo", from: "cebu", to: "davao", category: "philippines" },
  { id: "mnl-dvo", from: "manila", to: "davao", category: "philippines" },
  { id: "bkk-kl", from: "bangkok", to: "kuala-lumpur", category: "cross-border" },
  { id: "kl-sin", from: "kuala-lumpur", to: "singapore", category: "cross-border" },
  { id: "kl-jkt", from: "kuala-lumpur", to: "jakarta", category: "cross-border" },
  { id: "hcm-bkk", from: "ho-chi-minh-city", to: "bangkok", category: "cross-border" },
  { id: "sin-jkt", from: "singapore", to: "jakarta", category: "cross-border" },
  { id: "mnl-hcm", from: "manila", to: "ho-chi-minh-city", category: "cross-border" },
  { id: "mnl-kl", from: "manila", to: "kuala-lumpur", category: "cross-border" },
];

export const PILOT_HUBS = PHILIPPINE_HUBS;
export const PILOT_ROUTES = PHILIPPINE_ROUTES;

export interface PassengerRoutePresentation {
  origin: string;
  destination: string;
  bookingLabel: string;
  homeLabel: string;
  defaultAvailableSeats: number;
}

export interface AppRoute {
  id: string;
  origin: string;
  destination: string;
  label: string;
  operatorVisible: boolean;
  passengerQuickVisible: boolean;
  passengerQuickOrder?: number;
  passenger?: PassengerRoutePresentation;
}

export interface PassengerQuickRoute extends PassengerRoutePresentation {
  routeId: string;
}

export const ROUTE_CATALOG: readonly AppRoute[] = [
  {
    id: "26fd7e27-4920-510b-ae57-9424533347da",
    origin: "Davao City",
    destination: "Cagayan de Oro",
    label: "Davao → Cagayan de Oro",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 4,
    passenger: {
      origin: "Davao",
      destination: "Cagayan",
      bookingLabel: "Davao -> Cagayan",
      homeLabel: "Davao → Cagayan",
      defaultAvailableSeats: 32,
    },
  },
  {
    id: "eea70a1a-7420-5c5a-85f5-8f619fb68fa2",
    origin: "Davao City",
    destination: "Cotabato City",
    label: "Davao → Cotabato",
    operatorVisible: true,
    passengerQuickVisible: false,
  },
  {
    id: "f55422ef-6b76-56bb-99a1-47bf020e2112",
    origin: "Davao City",
    destination: "General Santos",
    label: "Davao → General Santos",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 5,
    passenger: {
      origin: "Davao",
      destination: "General Santos",
      bookingLabel: "Davao -> General Santos",
      homeLabel: "Davao → GenSan",
      defaultAvailableSeats: 29,
    },
  },
  {
    id: "16dc0d63-62dc-56ca-933b-d5bf6a344c12",
    origin: "Cagayan de Oro",
    destination: "Iligan City",
    label: "Cagayan de Oro → Iligan",
    operatorVisible: true,
    passengerQuickVisible: false,
  },
  {
    id: "bcb30dde-1726-5ebe-b10f-6e00d93627ac",
    origin: "Davao City",
    destination: "Butuan City",
    label: "Davao → Butuan",
    operatorVisible: true,
    passengerQuickVisible: false,
  },
  {
    id: "51f3fda4-ea0f-5d02-8151-8b277dc29165",
    origin: "Cotabato City",
    destination: "Zamboanga City",
    label: "Cotabato → Zamboanga",
    operatorVisible: true,
    passengerQuickVisible: false,
  },
  {
    id: "fd3199de-6ccf-500a-aedf-3f92e0a1841c",
    origin: "Pasay",
    destination: "Baguio",
    label: "Pasay → Baguio",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 0,
    passenger: {
      origin: "Pasay",
      destination: "Baguio",
      bookingLabel: "Pasay -> Baguio",
      homeLabel: "Pasay → Baguio",
      defaultAvailableSeats: 32,
    },
  },
  {
    id: "28cb28dd-44e4-57b4-ba5e-ec5641608cfb",
    origin: "Cubao",
    destination: "San Fernando City",
    label: "Cubao → San Fernando City",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 1,
    passenger: {
      origin: "Cubao",
      destination: "San Fernando City",
      bookingLabel: "Cubao -> San Fernando City",
      homeLabel: "Cubao → San Fernando",
      defaultAvailableSeats: 32,
    },
  },
  {
    id: "447f2d3b-1ffb-55b7-96c8-d0e9ece85a25",
    origin: "Panglao",
    destination: "Tagbilaran",
    label: "Panglao → Tagbilaran",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 2,
    passenger: {
      origin: "Panglao",
      destination: "Tagbilaran",
      bookingLabel: "Panglao -> Tagbilaran",
      homeLabel: "Panglao → Tagbilaran",
      defaultAvailableSeats: 32,
    },
  },
  {
    id: "4da4febe-3c2e-5158-93ed-1053a2a9d870",
    origin: "Tagbilaran",
    destination: "Jagna",
    label: "Tagbilaran → Jagna",
    operatorVisible: true,
    passengerQuickVisible: true,
    passengerQuickOrder: 3,
    passenger: {
      origin: "Tagbilaran",
      destination: "Jagna",
      bookingLabel: "Tagbilaran -> Jagna",
      homeLabel: "Tagbilaran → Jagna",
      defaultAvailableSeats: 1,
    },
  },
];

export const OPERATOR_ROUTES: readonly AppRoute[] = ROUTE_CATALOG.filter(
  (route) => route.operatorVisible
);

export const PASSENGER_QUICK_ROUTES: readonly PassengerQuickRoute[] =
  ROUTE_CATALOG.filter(
    (route): route is AppRoute & { passenger: PassengerRoutePresentation } =>
      route.passengerQuickVisible && route.passenger !== undefined
  )
    .sort(
      (a, b) =>
        (a.passengerQuickOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.passengerQuickOrder ?? Number.MAX_SAFE_INTEGER)
    )
    .map((route) => ({
      routeId: route.id,
      ...route.passenger,
    }));

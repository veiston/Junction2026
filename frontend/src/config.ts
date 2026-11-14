export const brand = {
  bankName: "Pankki",
  cardName: "Etukortti",
};

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const DEMO_CUSTOMER_ID: string =
  process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID ?? "CUST00001";

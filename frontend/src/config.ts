export const brand = {
  bankName: "Pankki",
  cardName: "Etukortti",
};

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const DEMO_CUSTOMER_ID: string =
  process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID ?? "CUST02706";
/** Developer buttons (purple) for the demo. Set EXPO_PUBLIC_DEV_TOOLS=0 to hide them. */
export const DEV_TOOLS: boolean = process.env.EXPO_PUBLIC_DEV_TOOLS !== "0";

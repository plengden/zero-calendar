import { createClient } from "@vercel/kv"


const KV_REST_API_URL = "YOUR_KV_REST_API_URL"
// This is the token for the KV REST API. You can find it in your Vercel dashboard under the KV settings.
const KV_REST_API_TOKEN = "YOUR_KV_REST_API_TOKEN"



export const calendarKv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
})

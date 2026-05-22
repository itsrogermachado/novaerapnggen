const url = "https://ejixsmqkyeltkqntvcpp.supabase.co/rest/v1/profiles";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXhzbXFreWVsdGtxbnR2Y3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzI3MzIsImV4cCI6MjA5NDk0ODczMn0.KAeEXAXaacB1c9XFA3B7cTlkeLq4H1zKbFo9QZaRCqo";

async function check() {
  console.log("Checking profiles table...");
  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response data:", data);
  } catch (err) {
    console.error("Error fetching profiles:", err);
  }
}

check();

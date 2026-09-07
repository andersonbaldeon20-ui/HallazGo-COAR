"use strict";

const HALLAZGO_SUPABASE_URL =
  "https://iyeyhzlkxwwhvnsslgbx.supabase.co";

const HALLAZGO_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_JFNW-9nZnJgullPoqS_8zw_vtoO3Ryj";

if (
  typeof window.supabase === "undefined" ||
  typeof window.supabase.createClient !== "function"
) {
  console.error(
    "ERROR: La biblioteca supabase-js no está cargada."
  );
} else {
  window.HallazgoDB =
    window.supabase.createClient(
      HALLAZGO_SUPABASE_URL,
      HALLAZGO_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  console.log(
    "Supabase conectado correctamente:",
    Boolean(window.HallazgoDB)
  );
}
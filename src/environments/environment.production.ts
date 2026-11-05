/**
 * Cloudflare Pages (producción).
 * Solo configura valores públicos: jamás service_role, contraseñas ni tokens.
 *
 * API no desplegada todavía. '/api/v1' es una ruta de espera sin backend;
 * cambiarla por 'https://<TU-BACKEND>/api/v1' cuando publiques la API.
 * El entorno de npm start conserva http://localhost:8080.
 */
export const environment = {
  apiBaseUrl: '/api/v1',
  supabaseUrl: 'https://gonhxfvelgxnjqpdyzpg.supabase.co',
  supabasePublishableKey: 'sb_publishable_zOoOsTuuvxtvHJ_CRuM2hw_iA3zNvd8',
  analyticsMeasurementId: ''
};

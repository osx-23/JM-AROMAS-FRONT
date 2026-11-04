# Dashboard de JM-AROMAS + Google Analytics 4

## Dashboard administrativo

**Ruta:** `/admin` redirige a `/admin/dashboard`. La gestión anterior del escáner, productos, pedidos, fotografías, promociones y pagos continúa en `/admin/inventario`.

La pantalla carga datos reales desde `GET /api/v1/admin/dashboard/resumen?dias=7|30|90` con el token Google/Supabase autorizado como ADMIN en el backend.

### Indicadores

- **Ingresos confirmados:** suma `pedidos.total` únicamente cuando `estado_pago='PAGADO'`. Se usa `confirmacion_pago_en` cuando existe (o `creado_en` en registros históricos).
- **Pedidos recibidos:** número creado en el período, pagados o no.
- **Pedidos pendientes:** creados en el período, no cancelados ni pagados.
- **Ticket promedio:** ingresos confirmados / pedidos pagados, evitando dividir por cero.
- **Ventas diarias:** serie diaria según la fecha de confirmación de pago; zona horaria `America/Lima`.
- **Métodos de pago:** distribución de cobros verificados por WhatsApp, Yape o transferencia.
- **Más vendidos:** líneas de pedidos ya pagados.
- **Inventario:** productos activos, publicados, stock 1-5 unidades y agotados, siempre como foto actual (independiente del filtro temporal).
- **Últimos pedidos:** últimos ocho por fecha de creación, también independientes del filtro de período.

El dashboard no presenta un pedido `PENDIENTE` como ingreso o venta confirmada, ni inventa métricas cuando faltan datos. Las solicitudes se leen desde el backend, nunca de tablas administrativas públicas.

## Google Analytics 4 — conexión pendiente del identificador

1. Entrar en [Google Analytics](https://analytics.google.com/).
2. Crear una **cuenta** y **propiedad GA4** para JM-AROMAS (si no existen).
3. En **Administrador → Flujos de datos → Web**, registrar la URL de la tienda.
4. Copiar el **ID de medición del flujo web**, que empieza por `G-`.
5. En `src/environments/environment.ts`, cambiar `analyticsMeasurementId: ''` por el ID real `G-XXXXXXXXXX`. Ese identificador es público y puede ir en el frontend; no es un token secreto.
6. Compilar y desplegar Angular. Abrir la tienda como visitante y elegir **Aceptar analítica**.
7. Validar que el tag envía eventos en **Realtime / DebugView** o **Google Tag Assistant**.

> No se ha inventado ningún ID de medición. Hasta introducir el ID real, el código **no carga** la etiqueta de Google ni muestra un banner de consentimiento innecesario.

### Consentimiento y privacidad

- El sitio usa modo básico: **no carga la etiqueta hasta que el visitante acepta**.
- Las preferencias se guardan localmente como `aceptado` o `rechazado`. Se pueden cambiar desde el botón **Privacidad y analítica**.
- Se registran exclusivamente eventos de comportamiento comercial: `page_view` de la portada, `view_item`, `add_to_cart`, `begin_checkout`.
- Solo se envían identificadores públicos de productos, cantidades y precios; **no** correos, nombres, teléfonos, DNI, direcciones, identificadores de pedido, tokens ni rutas privadas.
- No se envía el evento `purchase` al crear el pedido, porque un pedido pendiente **no equivale a un pago confirmado**.
- Antes de lanzar públicamente, publicar la política de privacidad apropiada y revisar obligaciones de consentimiento y retención.

### Diferencia entre dos identificadores

- **Measurement ID** `G-...`: habilita medición del sitio con `gtag.js`.
- **GA4 Property ID** numérico: permite obtener usuarios y tráfico desde la **Analytics Data API**; requiere autenticar el backend mediante Google OAuth o cuenta de servicio con permisos de lectura.

Esta versión integra Google Analytics para *capturar visitas y acciones* cuando se configure. En el dashboard se muestra un enlace para abrir los informes de GA4, pero **todavía no se importan estadísticas de tráfico de GA4 dentro del panel**. Para hacerlo hay que configurar la propiedad numérica y credenciales de consulta de forma segura en backend, nunca en Angular.

## Archivos relevantes

- `src/app/admin/dashboard/*`: tablero administrativo responsive.
- `src/app/analytics/analytics.service.ts`: tag, consentimiento y eventos.
- `src/app/app.component.ts`: diálogo de privacidad.
- `src/app/tienda/catalogo-page.component.ts`: eventos comerciales.
- `src/environments/environment.ts`: identificador público GA4.

## Pruebas recomendadas

1. Con administrador Google, abrir `/admin`; comprobar que redirige al dashboard.
2. Cambiar 7, 30 y 90 días y revisar que solo los pedidos pagados aportan ingresos.
3. Navegar a inventario, registrar un producto y confirmar el recuento (sin crear pedidos ficticios).
4. Sin sesión ADMIN, probar `GET /api/v1/admin/dashboard/resumen`: se debe rechazar.
5. Con ID GA4 real, rechazar analítica y comprobar que no se carga `gtag.js`.
6. Después aceptar, confirmar eventos sin información identificable en Tag Assistant.
7. Comprobar que URLs privadas `/pedido/{id}` y `/mi-perfil` nunca se envían.

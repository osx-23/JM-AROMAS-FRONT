# JM-AROMAS · Rediseño Tailwind y rendimiento del frontend

## Alcance de esta etapa

La rama `feature/mvp-base` incorpora **Tailwind CSS v4** al proyecto Angular 20 y un rediseño del **dashboard administrativo** con estilo editorial de perfumería premium. El catálogo, checkout, formularios de administración y pantallas existentes conservan su funcionalidad y su CSS anterior. La migración del resto de pantallas a Tailwind se realizará gradualmente, sin reescrituras riesgosas del flujo de venta.

### Diseño visual

- Paleta JM-AROMAS: espresso, cobre, porcelana, pergamino, verde salvia y tonos champagne.
- Tipografía editorial Playfair Display + DM Sans, con fuentes `display=swap` y conexiones preestablecidas.
- Dashboard mobile-first: navegación adaptable, resumen financiero oscuro, KPI, gráfico de ingresos, reparto de cobros, stock, pedidos, tabla de productos y acceso a GA4.
- Diseño implementado con **clases utilitarias Tailwind v4**; el CSS local del dashboard se redujo de ~11.3 kB de código fuente a menos de 1 kB inicialmente (sin contar nuevos estilos de contenido diferido).

### Instalación

```bash
git switch feature/mvp-base
git pull origin feature/mvp-base
npm install
npm run build:prod
npm start
```

La integración sigue la guía oficial Angular/Tailwind:
- Dependencias: `tailwindcss`, `@tailwindcss/postcss`, `postcss` (desarrollo, sin JavaScript de runtime).
- `.postcssrc.json` registra el plugin `@tailwindcss/postcss`.
- `src/styles.css` importa capas `theme` y `utilities` sin `preflight` para proteger los componentes legacy.
- Los colores, fuentes y sombras se definen como tokens CSS con `@theme`.
- Las rutas siguen usando `loadComponent` para carga diferida.

### Optimizaciones aplicadas

1. **Lector de barras lazy**: `@zxing/browser` / `@zxing/library` se importan dinámicamente cuando se abre la cámara, no al entrar al inventario.
2. **Dashboard OnPush**: reduce verificaciones de cambio; el gráfico y los valores derivados se calculan solo tras cada respuesta HTTP.
3. **Caché por período del dashboard (45 segundos)**: evita consultar repetidamente las mismas métricas al alternar períodos; **Actualizar** fuerza una petición nueva.
4. **Solicitudes fuera de orden**: si el usuario cambia de filtro antes de que termine la petición anterior, se ignoran las respuestas antiguas.
5. **Catálogo cacheado (60 segundos)**: comparte resultados recientes y evita peticiones duplicadas al navegar por la tienda.
6. **Imágenes no prioritarias**: `loading=lazy` y `decoding=async` en tarjetas y miniaturas.
7. **Render de secciones inferiores**: `content-visibility:auto` evita pintar listas que están fuera de la pantalla cuando el navegador lo soporta.
8. **Fuente optimizada**: `preconnect` a Google Fonts y descarga con `display=swap`.
9. **Presupuesto de compilación**: advertencia si el bundle inicial supera 650 kB y error sobre 850 kB, en producción.

### Medición comprobable

La compilación de **producción** ejecutada en GitHub Actions antes de añadir el presupuesto (run 41975655635) mostró:

| Indicador | Tamaño informado por Angular |
| --- | --- |
| Bundle inicial (total sin compresión) | 567.56 kB |
| Bundle inicial (transferencia estimada) | 142.76 kB |
| CSS global (transferencia estimada) | 4.33 kB |
| Dashboard lazy (transferencia estimada) | 9.04 kB |
| Inventario lazy (transferencia estimada) | 23.39 kB |
| Chunk grande de ZXing (transferencia estimada) | 90.75 kB |

Son métricas **del build**, no una medición de LCP, TTFB, velocidad de red ni un porcentaje de mejora del sitio. No comparar directamente estas cifras optimizadas con `ng serve` en desarrollo, porque son configuraciones distintas.

### Validación de velocidad real

1. Arrancar `npm start` para comprobar funcionamiento, pero usar **producción desplegada** para medir.
2. Abrir Chrome DevTools → Network, desactivar caché y seleccionar Slow 4G para evaluar el catálogo y el dashboard.
3. Ejecutar Lighthouse para LCP, INP, CLS y TBT; contrastar dispositivos y red.
4. Comprobar que en `/admin/inventario` **no** se descargue ZXing hasta pulsar **Activar cámara**.
5. Comprobar que alternar 7→30→7 días dentro de 45 segundos reutilice las métricas en memoria.
6. Confirmar que se siguen visualizando correctamente las fotos, productos, pagos y perfiles existentes.

### Próxima etapa sugerida

Migrar el **catálogo**, **checkout** e **inventario** a componentes Tailwind reutilizables; reducir el CSS heredado por módulo; aplicar paginación y mediciones Lighthouse antes de modificar el backend sin evidencia de cuellos de botella.

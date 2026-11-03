# Organización del frontend JM-AROMAS

Se mantiene Angular standalone y la navegación anterior, agrupando archivos por funcionalidad.

```text
src/app/
├── auth/                 # Sesiones y autorización con Google/Supabase
├── tienda/
│   ├── data-access/      # Servicio HTTP del catálogo
│   ├── models/           # Tipos de producto, carrito y filtros
│   ├── catalogo-page.component.{ts,html,css}
├── checkout/             # Compra, pagos y seguimiento
└── admin/
    ├── inventario/       # Escaneo, registro, stock e imágenes
    ├── productos/
    │   └── editor/       # Datos comerciales, presentación y descuentos
    └── pagos/            # Conciliación y configuración de medios de cobro
```

## Responsabilidades

- Componentes: UI y estados de pantalla; templates y CSS en archivos independientes.
- Data-access: HTTP y contratos de API por funcionalidad, sin almacenar secretos del backend.
- Models: tipos compartidos, sin datos de ejemplo. Los productos provienen de la API.
- Auth: servicio único de sesión, rol ADMIN/CLIENTE y guards.
- Contratos HTTP: mantener rutas de la API existente para no romper integraciones.

No se cambian rutas públicas (/ , /admin, /ingresar, /checkout), ni se crean productos ficticios.

## Próximas refactorizaciones seguras
- Extraer la cámara y los movimientos de inventario del componente principal.
- Añadir pruebas unitarias de formularios, filtros y servicios HTTP.
- Revisar la paginación y carga de catálogo con un volumen real de inventario.

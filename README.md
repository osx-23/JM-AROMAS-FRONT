# JM-AROMAS — Frontend

Tienda virtual de perfumes y productos similares con **panel de administración** y experiencia **mobile-first**.

> Estado: planificación / backlog inicial. No hay interfaz implementada todavía.

## Alcance MVP
- Inicio, catálogo por categorías, búsqueda y detalle de productos.
- Precios, descuentos vigentes, fotografías, disponibilidad y carrito.
- Inicio de sesión mediante Google.
- Área de cliente: perfil, teléfono, direcciones y pedidos.
- Checkout sin pasarela de pagos: pago contra entrega o método a coordinar con la administradora.
- Guardar pedido en backend y abrir WhatsApp de la administradora con texto prellenado. **El cliente envía manualmente el mensaje.**
- Panel admin restringido: catálogo, categorías, stock, descuentos, pedidos y sus estados.
- Escaneo de códigos de barras con cámara del celular para gestionar productos, con alternativa de ingreso manual.
- Diseño responsive para móvil, tablet y escritorio.

## Fase posterior
- Dashboard con gráficas de ventas confirmadas y pedidos.
- Pantallas de boletas/facturas electrónicas enlazadas a emisión real vía SUNAT.

## Flujo de venta
1. Cliente revisa catálogo y agrega productos.
2. Ingresa con Google y elige o registra dirección de entrega.
3. Selecciona `Contra entrega` o `A coordinar por WhatsApp`.
4. Confirma la generación del pedido (estado **PENDIENTE**).
5. Revisa el resumen y abre WhatsApp con mensaje prellenado; lo envía manualmente.
6. La administradora valida la compra, confirma disponibilidad, entrega y forma de pago.
7. Un pedido pendiente **no** debe mostrarse como venta cobrada.

## Backlog inicial
[Ver Issues del frontend](https://github.com/osx-23/JM-AROMAS-FRONT/issues) · [Backend](https://github.com/osx-23/JM-AROMAS-BACK).

## Decisiones pendientes
- Framework, librerías de UI y despliegue.
- Identidad visual, catálogo inicial y fotos.
- Número de WhatsApp del negocio, cobertura y tarifa de reparto.
- Políticas de cambios, devolución y tratamiento de datos personales.

Nunca guardar secretos, claves de Google o información de clientes en este repositorio público.

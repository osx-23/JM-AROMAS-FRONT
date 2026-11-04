# JM-AROMAS · Mi perfil del comprador

## Flujo

- Un cliente que inicia sesión con Google y realiza su primer pedido guarda su nombre, DNI, teléfono y dirección principal automáticamente en `public.perfiles` y `public.direcciones`.
- En los siguientes pedidos, el checkout recupera la información de esas tablas. Si es completa, muestra un **resumen guardado** en vez de pedir que escriba todos los campos otra vez.
- Desde `/mi-perfil` puede editar nombre, DNI, teléfono y dirección principal en cualquier momento.
- Si modifica los datos de entrega en un pedido nuevo, el backend guarda esos cambios en el perfil de la cuenta al finalizar el pedido.
- El correo viene de la sesión Google y aparece como solo lectura.
- Si el comprador es invitado, debe completar los datos en cada pedido; no se crea un perfil permanente sin una cuenta autenticada.

## Arquitectura

- `src/app/perfil/perfil-cliente.service.ts`: lectura/escritura mediante un único cliente Supabase Auth y las políticas RLS ya existentes; no guarda DNI o dirección en localStorage.
- `src/app/perfil/mi-perfil.component.{ts,html,css}`: gestión del perfil y dirección.
- `src/app/checkout/checkout-page.component.*`: precarga datos y presenta un resumen; el formulario sigue disponible para corregir datos.
- `src/app/app.routes.ts`: ruta pública `/mi-perfil`, pero el componente exige sesión Google para consultar o modificar datos.
- El backend guarda el snapshot del pedido para el historial y **actualiza** la dirección principal en lugar de insertar una nueva en cada compra.

## Privacidad y permisos

- Las tablas `public.perfiles` y `public.direcciones` ya cuentan con políticas RLS de SELECT/INSERT/UPDATE restringidas a `usuario_id = auth.uid()`.
- Los datos personales se obtienen con `auth.getUser()`, validación de sesión del lado de Supabase, y consultas filtradas por el usuario autenticado.
- No se muestra la información a visitantes; solo se conserva en Supabase y en memoria del componente mientras se usa.
- **No** utilizar el token de seguimiento de pedidos como autorización para editar un perfil.
- El email no se cambia desde esta pantalla; su origen es Google.

## Comprobación funcional

1. Iniciar sesión con Google en la tienda y pulsar **Mi perfil**.
2. Verificar que aparecen nombre y dirección de una compra previa, si existen.
3. Modificar un dato, pulsar **Guardar mi perfil**, recargar y comprobar que persiste.
4. Crear un nuevo pedido: el checkout debe presentar el resumen sin solicitar rellenar los campos.
5. Elegir **Editar datos de entrega** y comprobar que el formulario continúa funcionando.
6. Finalizar un pedido con la cuenta; revisar que el perfil y la dirección se actualizan sin duplicar direcciones.
7. Cerrar sesión: el perfil no debe presentar los datos de la cuenta anterior.
8. Iniciar sesión con otra cuenta: RLS debe impedir consultar o editar registros ajenos.

No realizar compras de prueba indiscriminadas en producción: crear pedidos reserva inventario.

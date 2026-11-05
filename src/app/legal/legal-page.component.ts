import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface SeccionLegal {
  id: string;
  titulo: string;
  parrafos: string[];
  puntos?: string[];
}
interface DocumentoLegal {
  titulo: string;
  subtitulo: string;
  introduccion: string;
  secciones: SeccionLegal[];
}

const privacidad: DocumentoLegal = {
  titulo: 'Política de privacidad',
  subtitulo: 'Tu información merece el mismo cuidado que tu elección.',
  introduccion: 'En JM Aromas explicamos qué información utilizamos al visitar la tienda, iniciar sesión con Google, guardar un perfil o realizar un pedido.',
  secciones: [
    {
      id: 'responsable', titulo: '1. Quién trata tus datos',
      parrafos: [
        'JM Aromas es la tienda de perfumes disponible en https://jmaromas.shop. Para consultas sobre privacidad o para ejercer tus derechos, escríbenos a notificaciones.jmaromas@gmail.com. El titular del negocio deberá completar la identificación legal del responsable del tratamiento y los datos de contacto exigibles por la normativa aplicable antes de presentar esta política como definitiva.',
        'Esta política se refiere a la información tratada a través del sitio de JM Aromas y a su coordinación de compras.'
      ]
    },
    {
      id: 'datos', titulo: '2. Información que podemos recopilar',
      parrafos: ['Según cómo utilices la tienda, podemos tratar las siguientes categorías:'],
      puntos: [
        'Cuenta de Google: identificador de usuario, nombre, correo electrónico e información básica del perfil facilitada por el proveedor de autenticación.',
        'Perfil y entrega: nombres, DNI, teléfono, correo electrónico, departamento, provincia, distrito, dirección y referencias que decidas registrar.',
        'Compras: artículos seleccionados, cantidades, importe, código de pedido, estado, método de coordinación o pago y datos necesarios para atender la solicitud.',
        'Comprobantes y comunicaciones: imágenes de comprobantes enviadas voluntariamente y mensajes intercambiados para coordinar un pedido.',
        'Datos técnicos: información mínima para mantener la sesión, seguridad y funcionamiento del sitio; estadísticas de navegación solo cuando corresponda y se otorgue consentimiento.'
      ]
    },
    {
      id: 'google', titulo: '3. Cómo utilizamos los datos de Google',
      parrafos: [
        'Al elegir «Continuar con Google», la autenticación se gestiona mediante Google y Supabase Auth. JM Aromas utiliza la identidad y el correo asociados a esa sesión para reconocer tu cuenta, permitirte consultar o guardar tu perfil y verificar si tienes permisos de administración.',
        'No solicitamos acceso a tu correo de Gmail, archivos de Google Drive, contactos ni otros servicios de Google para esta función. La contraseña de tu cuenta Google no se solicita ni almacena en JM Aromas.',
        'El inicio de sesión es opcional para explorar la tienda; algunas funciones, como guardar el perfil, requieren sesión.'
      ]
    },
    {
      id: 'finalidades', titulo: '4. Para qué utilizamos la información',
      parrafos: [
        'Utilizamos los datos necesarios para identificarte, mantener tu sesión, completar y administrar pedidos, coordinar entregas, revisar comprobantes, responder consultas y prevenir usos indebidos de la tienda.',
        'Si guardas tu perfil, sus datos pueden utilizarse para completar futuros pedidos sin volver a escribirlos. El tratamiento de la información se realiza en relación con los servicios solicitados y con las obligaciones legales aplicables.'
      ]
    },
    {
      id: 'proveedores', titulo: '5. Servicios externos y comunicaciones',
      parrafos: [
        'La tienda utiliza proveedores tecnológicos para operar: Supabase para autenticación, base de datos y almacenamiento; Railway para alojar la API; Cloudflare Pages para servir el sitio; y Google como proveedor de inicio de sesión. Estos servicios pueden procesar datos en infraestructura ubicada fuera del Perú.',
        'Cuando elijas coordinar una compra mediante WhatsApp, la información que decidas compartir en esa aplicación estará sujeta también a sus propias políticas. Los comprobantes de pago que adjuntes se utilizan para revisar manualmente el pago.',
        'JM Aromas no publica tu DNI, dirección, información de sesión ni comprobantes en el catálogo público.'
      ]
    },
    {
      id: 'cookies', titulo: '6. Cookies, sesión y analítica',
      parrafos: [
        'El navegador puede utilizar almacenamiento local o mecanismos equivalentes para mantener tu sesión y recordar preferencias de la tienda. Supabase Auth conserva información de sesión en el navegador mientras corresponda.',
        'El sitio dispone de una integración opcional con Google Analytics 4. Esta solo se activa cuando está configurada y aceptas las estadísticas mediante el aviso de consentimiento; puedes rechazar dicho uso sin impedir la navegación básica. No se deben enviar a Analytics tu DNI, dirección, teléfono, correo ni tokens de sesión.'
      ]
    },
    {
      id: 'conservacion', titulo: '7. Conservación y seguridad',
      parrafos: [
        'Los datos se conservan durante el tiempo necesario para atender la cuenta o los pedidos y, cuando corresponda, por los plazos exigidos legalmente. La eliminación de un perfil o pedido puede estar limitada por obligaciones de conservación y verificación.',
        'Aplicamos controles de acceso y autenticación para restringir operaciones privadas. Ningún servicio digital puede garantizar seguridad absoluta; si detectas un incidente o acceso no autorizado, comunícalo al correo de contacto.'
      ]
    },
    {
      id: 'derechos', titulo: '8. Tus derechos sobre los datos personales',
      parrafos: [
        'De acuerdo con la legislación peruana aplicable, puedes solicitar información sobre el uso de tus datos y ejercer los derechos de acceso, rectificación, cancelación y oposición, así como los demás que correspondan.',
        'Envía tu solicitud a notificaciones.jmaromas@gmail.com e indica el derecho que deseas ejercer y un medio de respuesta. Podremos solicitar información proporcionada de forma segura para verificar que la solicitud corresponde a su titular. Si no estás conforme con la atención, puedes acudir ante la Autoridad Nacional de Protección de Datos Personales del Perú.'
      ]
    },
    {
      id: 'actualizaciones', titulo: '9. Actualizaciones',
      parrafos: [
        'Esta política podrá modificarse cuando cambien las funciones del sitio, los servicios utilizados o las obligaciones legales. La fecha de actualización aparecerá en esta página.',
        'Marco de referencia: Ley N.º 29733 y su Reglamento aprobado por el Decreto Supremo N.º 016-2024-JUS, sin que la publicación de este texto sustituya la revisión legal del negocio.'
      ]
    }
  ]
};

const terminos: DocumentoLegal = {
  titulo: 'Términos y condiciones',
  subtitulo: 'Compra informado, elige con confianza.',
  introduccion: 'Estas condiciones describen el uso de la tienda JM Aromas y la coordinación de pedidos de perfumes y fragancias a través de nuestra página web.',
  secciones: [
    {
      id: 'tienda', titulo: '1. Sobre la tienda y estas condiciones',
      parrafos: [
        'JM Aromas opera el catálogo digital disponible en https://jmaromas.shop. Puedes contactar con la tienda en notificaciones.jmaromas@gmail.com para consultas sobre el sitio, productos o pedidos.',
        'Al navegar o utilizar las funciones de la tienda, te comprometes a proporcionar información veraz cuando registres una cuenta o solicites una compra. Estos términos no limitan los derechos irrenunciables de los consumidores reconocidos por la normativa peruana.'
      ]
    },
    {
      id: 'catalogo', titulo: '2. Catálogo, precios y disponibilidad',
      parrafos: [
        'La tienda muestra productos, descripciones, presentaciones, existencias, precios y, cuando corresponda, descuentos. Los importes se presentan en soles (PEN), salvo que se indique expresamente otra moneda.',
        'La información del catálogo puede actualizarse. La disponibilidad, el importe aplicable y los detalles de entrega se verifican durante el proceso de pedido; un artículo visible en pantalla no constituye una garantía de reserva o entrega inmediata.',
        'Ante un error material de precio o información, JM Aromas lo comunicará antes de completar una operación, respetando los derechos del consumidor.'
      ]
    },
    {
      id: 'pedidos', titulo: '3. Registro y confirmación de pedidos',
      parrafos: [
        'Puedes seleccionar productos y proporcionar los datos de contacto y entrega para generar una solicitud de pedido. El sistema puede asignar un código de seguimiento y presentar el estado de la operación.',
        'Registrar una solicitud o abrir WhatsApp no significa, por sí solo, que el pedido esté pagado, aceptado o despachado. La tienda debe verificar disponibilidad, datos y condiciones de la operación antes de confirmar lo que corresponda.',
        'En la modalidad WhatsApp, el cliente debe revisar y enviar el mensaje en la aplicación de WhatsApp para iniciar la coordinación.'
      ]
    },
    {
      id: 'pagos', titulo: '4. Pagos y comprobantes',
      parrafos: [
        'Según los medios habilitados por la tienda, el cliente podrá coordinar su pedido por WhatsApp o seleccionar opciones manuales como Yape o transferencia. Las opciones disponibles se muestran antes de completar la solicitud.',
        'Si compartes un comprobante, el pago quedará sujeto a verificación. Subir una imagen no equivale a la confirmación automática del abono. No se debe enviar información bancaria sensible distinta de la estrictamente necesaria para verificar la operación.'
      ]
    },
    {
      id: 'entrega', titulo: '5. Envíos y datos de entrega',
      parrafos: [
        'El cliente debe indicar correctamente su nombre, teléfono y dirección de entrega. El costo, la cobertura y el plazo de envío se coordinarán e informarán en función del pedido y el destino; no existe un plazo de entrega único garantizado en esta página.',
        'Si algún dato de entrega necesita modificarse, comunícate con la tienda tan pronto como sea posible usando el correo de contacto o el canal informado en tu pedido.'
      ]
    },
    {
      id: 'cambios', titulo: '6. Cambios, cancelaciones y reclamos',
      parrafos: [
        'Para solicitar una corrección, cancelación, cambio, devolución o presentar un reclamo, escribe a notificaciones.jmaromas@gmail.com e indica tu código de pedido y una descripción del caso.',
        'La evaluación tendrá en cuenta el estado del pedido, la naturaleza del producto y los derechos de los consumidores establecidos por las normas peruanas. No se excluyen ni restringen derechos reconocidos por ley.',
        'Antes de pagar, confirma con la tienda cualquier condición específica de entrega, devolución o cambio que resulte relevante para tu pedido.'
      ]
    },
    {
      id: 'cuentas', titulo: '7. Cuentas y uso permitido',
      parrafos: [
        'El inicio de sesión con Google es opcional para explorar productos. Si decides utilizarlo, Google y Supabase verifican tu identidad, mientras que JM Aromas valida los permisos de cada cuenta. Las funciones administrativas están reservadas a usuarios expresamente autorizados.',
        'No debes intentar acceder a datos o funciones de otras personas, manipular pedidos ni interferir con la seguridad o disponibilidad del sitio.'
      ]
    },
    {
      id: 'privacidad', titulo: '8. Privacidad y servicios de terceros',
      parrafos: [
        'El tratamiento de datos personales se describe en la Política de privacidad de JM Aromas, disponible desde el pie de página y en https://jmaromas.shop/politica-de-privacidad.',
        'Al utilizar Google para ingresar o WhatsApp para coordinar una compra, también pueden resultar aplicables las condiciones de dichas plataformas.'
      ]
    },
    {
      id: 'contacto', titulo: '9. Contacto y modificaciones',
      parrafos: [
        'Para cualquier consulta sobre estas condiciones o sobre un pedido, escribe a notificaciones.jmaromas@gmail.com.',
        'JM Aromas puede actualizar estas condiciones para reflejar cambios en sus servicios o en la normativa. La fecha de actualización quedará indicada en esta página. Las disposiciones legales de protección al consumidor prevalecen cuando resulten aplicables.'
      ]
    }
  ]
};

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-page.component.html',
  styleUrls: ['./legal-page.component.css']
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly tipo = this.route.snapshot.data['tipo'] === 'terminos' ? 'terminos' : 'privacidad';
  readonly pagina = this.tipo === 'terminos' ? terminos : privacidad;
  readonly actualizado = '5 de noviembre de 2026';
}

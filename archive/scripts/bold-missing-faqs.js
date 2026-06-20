/**
 * Añade **negrita** a FAQs que no tienen formato markdown en la respuesta.
 * Uso: node archive/scripts/bold-missing-faqs.js
 */
require('dotenv').config();
const db = require('../../db');

const UPDATES = {
  5: `Para dar de baja una tarea, puedes ingresar a **Mis tareas** o **Tareas del equipo**. Una vez ubicada la tarea correspondiente, selecciona el ícono **">"** resaltado en color azul (ver imagen adjunta).

Desde allí podrás acceder a las acciones disponibles para la tarea y completar el proceso de baja de forma rápida y sencilla.`,
  6: `Dentro de una tarea encontrarás varias acciones disponibles. De izquierda a derecha, los íconos corresponden a:

- **Agregar nota**: Permite registrar comentarios, observaciones o información relevante relacionada con la tarea.

- **Posponer**: Permite reprogramar la tarea para una fecha posterior cuando no pueda ser gestionada en el momento.

- **Ignorar**: Permite descartar la tarea para que deje de aparecer dentro de tus pendientes.

Estas opciones se encuentran disponibles directamente sobre cada tarea para facilitar su gestión diaria (ver imagen adjunta).`,
  7: `Para acceder a los documentos asociados a una orden, haz clic en el **menú de tres puntos** ubicado dentro de la orden correspondiente. Se desplegará un menú con diferentes opciones.

Selecciona la opción **Plantilla de documentos** y se mostrará la lista de documentos disponibles para esa orden. Desde allí podrás elegir y visualizar el documento que necesites (ver imagen adjunta).`,
  8: `Para acceder a la plataforma, ingresa a **app.logihub.com** desde tu navegador web.

Una vez dentro, deberás ingresar:

- **Correo electrónico**: el correo que te fue proporcionado para acceder a la plataforma.

- **Contraseña**: la misma contraseña que utilizabas en la versión anterior de **LogiHub V1**.

Si presentas inconvenientes para acceder o has olvidado tu contraseña, por favor comunícate con nuestro equipo de soporte a través de los canales oficiales para recibir asistencia.`,
  9: `**Tareas del equipo** muestra las actividades o acciones que deben realizar los diferentes usuarios involucrados en una orden, de acuerdo con el flujo operativo definido. Esta vista permite tener visibilidad sobre el estado general de las tareas asociadas al proceso y el avance de los distintos participantes.

**Mis tareas**, por otro lado, muestra únicamente las tareas que han sido asignadas a tu usuario y que requieren una acción directa de tu parte dentro del flujo. Estas son las actividades de las que eres responsable y que debes gestionar para mantener el avance de la operación.

En resumen:

**Tareas del equipo**: visualiza las tareas de todos los participantes (incluyendo las mías) involucrados en la orden.
**Mis tareas**: visualiza únicamente las tareas asignadas a tu usuario.`,
  10: `Para activar un servicio dentro de una orden, haz clic en el **ícono de switch** ubicado junto al servicio correspondiente. A continuación, selecciona el tipo de servicio que deseas asignar:

- **Nuestro Equipo (Directo)**
- **Servicio (Tercerizado)**
- **Externo**

Una vez seleccionado el tipo, el servicio quedará habilitado dentro de la operación.

Si necesitas desactivar o eliminar un servicio previamente asignado, vuelve a hacer clic en el switch y selecciona la opción **Cancelar servicio**.

Consulta las imágenes adjuntas como referencia visual para este proceso.`,
  11: `Para cambiar el responsable de una tarea, primero localiza la tarea correspondiente dentro de la orden. Luego, haz clic sobre el ícono que muestra las **iniciales del usuario** actualmente asignado.

Al hacerlo, se abrirá una ventana donde podrás seleccionar un nuevo **usuario responsable** de la tarea o, si corresponde, **autoasignarte** la tarea para gestionarla directamente.

Una vez realizada la selección, la asignación se actualizará automáticamente.

Consulta la imagen adjunta como referencia visual para este proceso.`,
  12: `La información complementaria de una orden se encuentra en la pestaña **Campos adicionales**. Dentro de esta sección encontrarás distintos grupos de información organizados por categorías.

**General**

- **Gate-In**
- **Dirección de entrega**
- **Dirección de retiro**
- **Descripción pago flete**
- **Comentarios**

**Documento de transporte**

- **Fecha de documento**
- **Notificador**
- **Agente (OCE)**
- **Intermediario**
- **Descripción notify**
- **Consignatario**
- **Embarcador**
- **Descripción consignee**
- **Descripción de embarcador**
- **Agencia coload**
- **Terminal**
- **País, ciudad origen BL**
- **Puerto transbordo**

**Opciones alternas**

- **Consignee alterno**
- **Embarcador alterno**
- **Descripción consignee alterno**
- **Descripción embarcador alterno**
- **Referencia AES**
- **Atención**
- **Aprobación**
- **Referencias de exportación**
- **Rutas internas / Instrucciones de exportación**
- **Lugar de recepción**
- **Comentario aux (Factura)**

La disponibilidad y contenido de algunos campos puede variar según el tipo de operación y la información registrada en la orden.`,
  13: `Sí. **LogiHub V2** permite cambiar el idioma de la interfaz entre **español** e **inglés** de forma rápida y sencilla.

Para hacerlo, ubica el **ícono del mundo** 🌐 en la plataforma y haz clic sobre él. A continuación, selecciona el idioma que deseas utilizar y la interfaz se actualizará automáticamente.`,
  14: `Para desvincular una cotización de una orden, ingresa a la pestaña **Rubros** dentro de la orden correspondiente.

Una vez allí, haz clic en el **ícono de clip** asociado a la cotización. Se desplegarán las opciones disponibles, donde podrás seleccionar la opción para **desvincular la cotización** de la orden.

Al completar esta acción, la cotización dejará de estar asociada a la orden.

Consulta la imagen adjunta como referencia visual para este proceso.`,
  15: `Si necesitas volver a ejecutar una tarea que ya fue completada, debes dirigirte a la sección de **Actividades** dentro de la orden.

Busca la tarea que deseas reiniciar. Podrás identificar las tareas completadas porque muestran un **ícono de rayo color verde**.

Una vez localizada, haz clic en el ícono **"^"** asociado a la actividad y selecciona la opción **Reiniciar**.

Al realizar esta acción, la tarea volverá a quedar disponible dentro del flujo para que pueda ser ejecutada nuevamente.

Consulta la imagen adjunta como referencia visual para este proceso.`,
  16: `Para cambiar el responsable de un rol dentro de una orden, ubica el servicio correspondiente y desplázate hasta el lado derecho del widget del servicio.

Haz clic en la opción **Roles** para visualizar todos los roles asociados a ese servicio. Una vez dentro, selecciona el nombre del usuario que deseas cambiar.

Se abrirá una ventana donde podrás escoger al nuevo **usuario responsable** para ese rol. Después de seleccionar el usuario, el cambio se guardará automáticamente y el nuevo responsable quedará asignado.`,
  17: `Si una orden ha sido finalizada y necesitas volver a activarla, ingresa a la orden correspondiente y haz clic en el **menú de tres puntos** ubicado en la parte superior de la pantalla.

A continuación, selecciona la opción **Acciones** y luego haz clic en **Activar orden**.

Una vez realizada esta acción, la orden volverá a estar activa y disponible para continuar con su gestión operativa.

Consulta la imagen adjunta como referencia visual para este proceso.`,
  18: `**LogiHub** es una plataforma de gestión logística y comercio exterior que centraliza **órdenes**, **embarques**, **documentos**, **tareas**, **cotizaciones**, **mensajería** y procesos financieros. Permite a importadores, exportadores y operadores logísticos coordinar toda la operación en un solo lugar.`,
  24: `Una orden puede encontrarse en distintos estados según su avance operativo: **activa**, **en gestión**, **con servicios pendientes**, **lista para facturar** o **finalizada**. El estado refleja en qué etapa del flujo se encuentra la operación y qué acciones están disponibles.`,
  40: `Depende de la configuración del **servicio** y del **flujo** definido por tu organización. En general, cada **rol** tiene un responsable principal, pero algunos perfiles permiten **reasignación** o múltiples participantes según el tipo de operación.`
};

(async () => {
  const now = new Date();
  let updated = 0;
  for (const [id, answer] of Object.entries(UPDATES)) {
    const [result] = await db.pool.query(
      'UPDATE faqs SET answer = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [answer, now, id]
    );
    if (result.affectedRows) {
      updated++;
      console.log(`✓ FAQ ${id} actualizada`);
    } else {
      console.warn(`⚠ FAQ ${id} no encontrada o anulada`);
    }
  }
  console.log(`\nListo: ${updated} respuestas con negrita.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

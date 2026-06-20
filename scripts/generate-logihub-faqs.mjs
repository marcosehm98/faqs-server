#!/usr/bin/env node
/**
 * Explora LogiHub y genera FAQs genéricas con groupId / categoryId.
 * Uso: LOGIHUB_EMAIL=... LOGIHUB_PASSWORD=... node scripts/generate-logihub-faqs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMAIL = process.env.LOGIHUB_EMAIL || 'soporte+bpc@logihub.com';
const PASSWORD = process.env.LOGIHUB_PASSWORD || 'prosoporte2025loga-';
const TZ = process.env.LOGIHUB_TZ || 'America/Guayaquil';

/** Categorías en Faqs-SC (Aiven) */
const CAT = {
  INICIO:      { groupId: 2, categoryId: 3,  category: 'Inicio-Sesión' },
  ORDENES:     { groupId: 2, categoryId: 4,  category: 'Ordenes' },
  TAREAS:      { groupId: 2, categoryId: 5,  category: 'Gestión de tareas' },
  SERVICIOS:   { groupId: 2, categoryId: 6,  category: 'Gestión de servicios' },
  CAMPOS:      { groupId: 2, categoryId: 7,  category: 'Órdenes y campos adicionales' },
  CONFIG:      { groupId: 2, categoryId: 8,  category: 'Configuración y personalización' },
  COTIZ:       { groupId: 2, categoryId: 9,  category: 'Cotizaciones y órdenes' },
  ROLES:       { groupId: 2, categoryId: 10, category: 'Roles y responsables' },
  GESTION_ORD: { groupId: 2, categoryId: 11, category: 'Gestión de órdenes' },
  FIN:         { groupId: 12, categoryId: null, category: 'Financiero' }
};

/** Preguntas que ya existen en la BD — no regenerar */
const EXISTING = [
  /doy de baja mis tareas/i,
  /nota.*pospongo.*ignoro/i,
  /visualizar los documentos relacionados/i,
  /inicio sesión en LogiHub V2/i,
  /Tareas del equipo.*Mis tareas/i,
  /activo o desactivo un servicio/i,
  /responsable de una tarea dentro/i,
  /información adicional de una orden/i,
  /idioma de la plataforma/i,
  /desvinculo una cotización/i,
  /reinicio una tarea que ya fue realizada/i,
  /responsable de un rol dentro/i,
  /reactivo una orden finalizada/i
];

async function login() {
  const res = await fetch('https://boot.logihub.com/login2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, tz: TZ })
  });
  if (!res.ok) throw new Error(`Login falló: ${res.status}`);
  const auth = res.headers.get('authorization');
  const user = await res.json();
  return { auth, user };
}

async function fetchBundles() {
  const html = await (await fetch('https://app.logihub.com/login')).text();
  const common = html.match(/\/assets\/common\.[a-z0-9]+\.js/)?.[0];
  const index = html.match(/\/assets\/index\.[a-z0-9]+\.js/)?.[0];
  const [commonJs, indexJs] = await Promise.all([
    fetch(`https://app.logihub.com${common}`).then((r) => r.text()),
    fetch(`https://app.logihub.com${index}`).then((r) => r.text())
  ]);
  return { commonJs, indexJs };
}

async function fetchModules(auth, orgSpaceId) {
  const res = await fetch(`https://boot.logihub.com/preferences?orgSpaceId=${orgSpaceId}`, {
    headers: { Authorization: auth, Accept: 'application/json' }
  });
  if (!res.ok) return [];
  const prefs = await res.json();
  return prefs
    .filter((p) => p.name?.startsWith('module_') && p.value === '1')
    .map((p) => p.name.replace('module_', ''));
}

function faq(catKey, order, question, answer, tags = []) {
  const c = CAT[catKey];
  return {
    question,
    answer,
    category: c.category,
    groupId: c.groupId,
    categoryId: c.categoryId,
    order,
    tags,
    attachments: []
  };
}

function buildAllFaqs(modules) {
  const has = (m) => modules.includes(m);
  const list = [];

  // ── Inicio / acceso ──
  list.push(
    faq('INICIO', 2,
      '¿Qué hago si olvidé mi contraseña?',
      'En la pantalla de inicio de sesión de **app.logihub.com**, selecciona **Forgot your password?** e ingresa tu correo corporativo. Recibirás un enlace por email para restablecer la contraseña. Si no llega el mensaje, revisa spam o contacta a soporte.',
      ['contraseña', 'recuperación', 'acceso']
    ),
    faq('INICIO', 3,
      '¿Para qué sirve la opción "Remember me"?',
      'Al marcar **Remember me** (Recordarme), el navegador conservará tu sesión activa por más tiempo en ese equipo. Úsala solo en computadoras de confianza. En equipos compartidos, evita activarla y cierra sesión al terminar.',
      ['sesión', 'seguridad', 'login']
    ),
    faq('INICIO', 4,
      '¿Cómo cierro sesión en LogiHub?',
      'Haz clic en tu perfil o menú de usuario en la esquina superior y selecciona **Cerrar sesión / Sign out**. Esto finaliza tu acceso en ese navegador y protege tu cuenta si compartes el equipo.',
      ['logout', 'sesión', 'seguridad']
    )
  );

  // ── Órdenes (general, sin duplicar las existentes) ──
  list.push(
    faq('ORDENES', 1,
      '¿Cómo creo una nueva orden en LogiHub?',
      'Desde el módulo de **Órdenes**, utiliza el botón de creación (generalmente **Nueva orden** o **+**). Completa los datos básicos solicitados — cliente, tipo de operación, puertos o rutas según corresponda — y guarda. La orden quedará disponible para asignar servicios, tareas y documentos.',
      ['órdenes', 'crear', 'operaciones']
    ),
    faq('ORDENES', 2,
      '¿Cómo busco una orden específica?',
      'Puedes localizar una orden desde el **listado de órdenes** aplicando filtros por referencia, cliente, estado o fechas. También puedes usar la **búsqueda global** en la barra superior para saltar directamente a la orden por número o palabra clave.',
      ['órdenes', 'búsqueda', 'filtros']
    ),
    faq('ORDENES', 3,
      '¿Qué estados puede tener una orden?',
      'Una orden puede encontrarse en distintos estados según su avance operativo: activa, en gestión, con servicios pendientes, lista para facturar o finalizada. El estado refleja en qué etapa del flujo se encuentra la operación y qué acciones están disponibles.',
      ['órdenes', 'estados', 'flujo']
    ),
    faq('ORDENES', 4,
      '¿Cómo finalizo una orden?',
      'Cuando la operación esté completada, abre la orden y utiliza el menú de acciones (tres puntos) para seleccionar **Finalizar orden**. Verifica antes que servicios, tareas y documentos críticos estén cerrados. Una orden finalizada puede reactivarse si tu perfil lo permite.',
      ['órdenes', 'finalizar', 'cierre']
    ),
    faq('ORDENES', 5,
      '¿Cómo subo o adjunto archivos a una orden?',
      'Dentro del detalle de la orden encontrarás secciones de **documentos** o **adjuntos**. Puedes cargar archivos desde tu equipo o pegar imágenes según la configuración. Los documentos quedan asociados a la operación para consulta del equipo.',
      ['documentos', 'adjuntos', 'órdenes']
    )
  );

  // ── Tareas (complementarias) ──
  list.push(
    faq('TAREAS', 4,
      '¿Cómo filtro las tareas en el listado?',
      'En **Mis tareas** o **Tareas del equipo** puedes aplicar filtros por estado, responsable, fecha o concepto. Esto facilita priorizar pendientes urgentes y dar seguimiento al avance del equipo en cada orden.',
      ['tareas', 'filtros', 'listado']
    ),
    faq('TAREAS', 5,
      '¿Qué es una tarea delegada?',
      'Una tarea **delegada** es aquella que fue asignada a otro usuario para su ejecución. Aparece en el listado del responsable asignado y permite mantener trazabilidad de quién debe completar cada acción dentro del flujo.',
      ['tareas', 'delegadas', 'asignación']
    ),
    faq('TAREAS', 6,
      '¿Puedo solicitar tareas al equipo desde una orden?',
      'Sí. Según tu perfil, puedes **solicitar tareas** vinculadas a la orden para que otro usuario o área las gestione. Esto ayuda a coordinar acciones entre departamentos sin salir de la plataforma.',
      ['tareas', 'solicitar', 'equipo']
    )
  );

  // ── Servicios ──
  list.push(
    faq('SERVICIOS', 2,
      '¿Qué significa Nuestro Equipo (Directo), Servicio (Tercerizado) y Externo?',
      'Al activar un servicio en una orden debes indicar quién lo ejecuta:\n\n- **Nuestro Equipo (Directo):** lo realiza tu propia organización.\n- **Servicio (Tercerizado):** lo ejecuta un proveedor aliado dentro de LogiHub.\n- **Externo:** lo gestiona un tercero fuera del flujo interno estándar.\n\nLa elección correcta impacta tareas, roles y facturación asociada.',
      ['servicios', 'tipos', 'órdenes']
    ),
    faq('SERVICIOS', 3,
      '¿Dónde consulto el detalle de los servicios de una orden?',
      'En el cuerpo principal de la orden verás los **widgets de servicios** activos. Cada uno muestra estado, responsables, roles vinculados y acciones disponibles (activar, cancelar, configurar). Haz clic en el servicio para ver más detalle.',
      ['servicios', 'detalle', 'órdenes']
    )
  );

  // ── Campos adicionales (complemento) ──
  list.push(
    faq('CAMPOS', 2,
      '¿Puedo editar los campos adicionales de una orden?',
      'Sí. En la pestaña **Campos adicionales** puedes completar o modificar la información complementaria de la operación (direcciones, datos de BL, referencias, comentarios, etc.) según los permisos de tu usuario. Los cambios se guardan en la orden para todo el equipo.',
      ['campos adicionales', 'editar', 'órdenes']
    )
  );

  // ── Configuración ──
  list.push(
    faq('CONFIG', 2,
      '¿Cómo cambio entre modo claro y oscuro?',
      'LogiHub permite alternar la apariencia de la interfaz. Busca la opción **Light/Dark Mode** en el login o en el menú de usuario/configuración y selecciona el tema que prefieras. El cambio se aplica de inmediato en toda la plataforma.',
      ['tema', 'modo oscuro', 'interfaz']
    ),
    faq('CONFIG', 3,
      '¿Para qué sirven las reglas comerciales?',
      'En **Configuraciones → Reglas comerciales** los administradores definen parámetros que afectan cotizaciones, márgenes, validaciones y comportamiento comercial de la organización. Si no ves esta sección, tu usuario no tiene permisos de administración.',
      ['configuración', 'reglas comerciales', 'admin']
    ),
    faq('CONFIG', 4,
      '¿Qué es la gestión de dispositivos?',
      'La sección **Dispositivos** permite revisar desde qué equipos o navegadores se ha accedido a la plataforma. Es útil para auditoría de seguridad y control de sesiones activas en la organización.',
      ['dispositivos', 'seguridad', 'configuración']
    )
  );

  // ── Cotizaciones ──
  list.push(
    faq('COTIZ', 2,
      '¿Cómo creo una nueva cotización?',
      'Ingresa al módulo de **Oportunidades** o **Cotizaciones** (según la configuración de tu cuenta) y selecciona **Crear**. Completa datos del cliente, rutas, servicios y condiciones comerciales. La cotización podrá convertirse en orden cuando el cliente confirme.',
      ['cotizaciones', 'crear', 'comercial']
    ),
    faq('COTIZ', 3,
      '¿Cómo vinculo una cotización a una orden?',
      'Desde la pestaña **Rubros** de la orden, utiliza el ícono de clip para asociar una cotización existente. Al vincularla, los rubros y condiciones pactadas se reflejan en la operación. Para desvincularla, usa las mismas opciones del menú de rubros.',
      ['cotizaciones', 'vincular', 'rubros']
    ),
    faq('COTIZ', 4,
      '¿Qué son los acuerdos de tarifas (rate agreements)?',
      'Los **acuerdos de tarifas** son condiciones comerciales prenegociadas con clientes o proveedores. Al cotizar, LogiHub puede aplicar automáticamente tarifas vigentes según ruta, transportista y tipo de servicio, agilizando el proceso comercial.',
      ['tarifas', 'rate agreements', 'pricing']
    )
  );

  // ── Roles ──
  list.push(
    faq('ROLES', 2,
      '¿Qué son los roles dentro de un servicio?',
      'Los **roles** definen qué usuario cumple cada función en un servicio de la orden (ej. operativo, comercial, coordinador). Cada rol puede tener un responsable asignado y determina qué tareas y notificaciones recibe esa persona.',
      ['roles', 'servicios', 'responsables']
    ),
    faq('ROLES', 3,
      '¿Puedo tener varios usuarios en el mismo rol?',
      'Depende de la configuración del servicio y del flujo definido por tu organización. En general, cada rol tiene un responsable principal, pero algunos perfiles permiten reasignación o múltiples participantes según el tipo de operación.',
      ['roles', 'usuarios', 'asignación']
    )
  );

  // ── Gestión de órdenes ──
  list.push(
    faq('GESTION_ORD', 2,
      '¿Cómo consulto el historial de cambios de una orden?',
      'Dentro del detalle de la orden puedes revisar **actividades**, comentarios y eventos registrados en el flujo. Esto incluye tareas completadas, cambios de responsable, activación de servicios y otras acciones relevantes para auditoría operativa.',
      ['historial', 'actividades', 'órdenes']
    ),
    faq('GESTION_ORD', 3,
      '¿Cómo uso el menú de tres puntos en una orden?',
      'El menú **⋮** concentra acciones avanzadas: plantilla de documentos, acciones de estado (activar/finalizar), configuraciones específicas y otras opciones según tu perfil. Es el acceso rápido a funciones que no están en la vista principal.',
      ['menú', 'acciones', 'órdenes']
    )
  );

  // ── Embarques / Explorer (si módulo activo) ──
  if (has('shipments')) {
    list.push(
      faq('ORDENES', 10,
        '¿Qué es el Explorer de embarques?',
        'El **Explorer** es la vista avanzada para consultar y analizar embarques con múltiples filtros: cliente, puerto origen/destino, modo de transporte, proveedor y más. Ideal para equipos que gestionan alto volumen de operaciones.',
        ['explorer', 'embarques', 'filtros']
      ),
      faq('ORDENES', 11,
        '¿Cómo importo embarques a LogiHub?',
        'En el módulo de embarques encontrarás la opción **Importar**, que permite cargar operaciones desde plantillas o fuentes externas según la configuración de tu organización. Verifica el formato requerido antes de subir el archivo.',
        ['embarques', 'importar', 'carga']
      ),
      faq('ORDENES', 12,
        '¿Dónde consulto itinerarios o schedules de transporte?',
        'En operaciones marítimas puedes revisar **itinerarios** (feeder, madre, transit time, cut-off de carga) desde el detalle del embarque o la sección de **schedules**. Esto ayuda a planificar cut-offs y coordinar con navieras.',
        ['itinerarios', 'schedules', 'marítimo']
      )
    );
  }

  // ── Búsqueda global ──
  list.push(
    faq('ORDENES', 20,
      '¿Para qué sirve la búsqueda global (OmniSearch)?',
      'La **búsqueda global** en la barra superior permite encontrar rápidamente órdenes, compañías, mensajes y otros registros sin navegar menú por menú. Escribe una referencia, nombre o palabra clave y selecciona el resultado.',
      ['omnisearch', 'búsqueda', 'atajos']
    )
  );

  // ── Red / compañías ──
  list.push(
    faq('ORDENES', 21,
      '¿Cómo gestiono compañías y contactos en LogiHub?',
      'En el módulo **Compañías** (Network) puedes crear y mantener clientes, proveedores, transportistas y grupos de contactos. Esta información se usa al crear órdenes, cotizaciones y asignar servicios tercerizados.',
      ['compañías', 'contactos', 'network']
    ),
    faq('ORDENES', 22,
      '¿Qué son los usuarios de portal?',
      'Los **usuarios de portal** son cuentas externas (clientes o proveedores) con acceso limitado para consultar o interactuar con operaciones específicas. Se gestionan desde la sección de compañías según los permisos de tu organización.',
      ['portal', 'usuarios externos', 'accesos']
    )
  );

  // ── Mensajería ──
  list.push(
    faq('ORDENES', 23,
      '¿Cómo me comunico con mi equipo dentro de una orden?',
      'Usa el módulo de **mensajería** integrado en la operación para enviar comentarios, acuerdos o aclaraciones. Las conversaciones quedan vinculadas a la orden y son visibles para los participantes autorizados.',
      ['mensajería', 'comunicación', 'equipo']
    ),
    faq('ORDENES', 24,
      '¿Cuál es la diferencia entre mensaje público y privado?',
      'Un mensaje **público** es visible para los participantes de la operación según permisos del hilo. Un mensaje **privado** restringe la visibilidad a destinatarios específicos. Usa privados para información sensible y públicos para coordinación general.',
      ['mensajería', 'privado', 'público']
    )
  );

  // ── Oportunidades ──
  if (has('commercial') || has('pricing')) {
    list.push(
      faq('COTIZ', 10,
        '¿Cómo doy seguimiento a mis oportunidades comerciales?',
        'En **Oportunidades → Listado** puedes ver el estado de cada cotización u oportunidad: en preparación, enviada, ganada o perdida. Utiliza filtros y el detalle de cada registro para dar seguimiento al pipeline comercial.',
        ['oportunidades', 'seguimiento', 'comercial']
      )
    );
  }

  // ── Financiero / rubros ──
  list.push(
    faq('FIN', 1,
      '¿Qué son los rubros en una orden?',
      'Los **rubros** son los conceptos de ingreso o costo asociados a una operación (fletes, gastos locales, honorarios, etc.). Se gestionan en la pestaña **Rubros** y pueden vincularse a cotizaciones, documentos de venta o compra.',
      ['rubros', 'cargos', 'financiero']
    ),
    faq('FIN', 2,
      '¿Cómo agrego un rubro de venta o costo?',
      'En la pestaña **Rubros** de la orden, agrega un nuevo concepto indicando tipo (venta/costo), monto, moneda y documento asociado si aplica. Los rubros alimentan la facturación y el control de márgenes de la operación.',
      ['rubros', 'venta', 'costo']
    ),
    faq('FIN', 3,
      '¿Dónde consulto documentos de venta vinculados a rubros?',
      'En cada rubro puedes ver si tiene **documento de venta** o **documento de costo** asociado. Desde ahí accedes al comprobante generado o pendiente, según el estado de facturación de la operación.',
      ['documentos', 'venta', 'rubros']
    )
  );

  if (has('accounting')) {
    list.push(
      faq('FIN', 4,
        '¿Cómo funciona el módulo de contabilidad en LogiHub?',
        'El módulo **Accounting** conecta la operación logística con registros contables: facturas, pagos, cobros y asientos. Según tu configuración, los movimientos pueden generarse automáticamente al facturar servicios de una orden.',
        ['contabilidad', 'accounting', 'integración']
      ),
      faq('FIN', 5,
        '¿Qué es el diario (journal) contable?',
        'El **journal** o diario registra los asientos contables derivados de operaciones, facturas y pagos. Permite conciliar la gestión logística con la contabilidad de la organización y exportar información para auditoría.',
        ['journal', 'asientos', 'contabilidad']
      ),
      faq('FIN', 6,
        '¿Cómo genero una factura desde una orden?',
        'Cuando los servicios están listos para facturar, utiliza las opciones de **facturación** disponibles en la orden o en el módulo de ventas. El sistema puede crear el documento de venta y asociarlo a los rubros correspondientes según la configuración de tu empresa.',
        ['facturación', 'factura', 'ventas']
      ),
      faq('FIN', 7,
        '¿Dónde consulto pagos y cobros pendientes?',
        'En los módulos financieros (**Ventas**, **Compras** o **Accounting**) encontrarás listados de documentos pendientes de pago o cobro. Filtra por cliente, proveedor, fecha o estado para priorizar la gestión de tesorería.',
        ['pagos', 'cobros', 'tesorería']
      )
    );
  }

  if (has('orders')) {
    list.push(
      faq('FIN', 10,
        '¿Qué significa que un servicio esté "listo para facturar"?',
        'Cuando un servicio cumple las condiciones operativas y comerciales definidas, pasa a estado **listo para facturar**. Esto indica que puede generarse el documento de venta o compra correspondiente sin bloqueos pendientes en el flujo.',
        ['facturación', 'servicios', 'estados']
      )
    );
  }

  if (has('pricing')) {
    list.push(
      faq('FIN', 11,
        '¿Qué es el módulo de Pricing?',
        '**Pricing** centraliza la gestión de tarifas, manifiestos y condiciones por país o transportista. Permite consultar tarifas aplicadas a una operación y validar que los rubros cotizados coincidan con los acuerdos vigentes.',
        ['pricing', 'tarifas', 'manifiestos']
      ),
      faq('FIN', 12,
        '¿Cómo consulto la tarifa aplicada a un embarque?',
        'En el detalle de la operación, la sección de **tarifa aplicada** muestra si existe un acuerdo vigente, el transportista asociado y posibles diferencias. Si no hay tarifa, el sistema lo indicará para que puedas cotizar manualmente.',
        ['tarifas', 'embarques', 'pricing']
      )
    );
  }

  // ── Compras / ventas ──
  list.push(
    faq('FIN', 20,
      '¿Cómo gestiono compras vinculadas a operaciones?',
      'En el módulo de **Compras** registras costos de proveedores asociados a órdenes o servicios. Puedes dar seguimiento a estados como confirmación pendiente, arribo y revisión por parte del cliente o proveedor.',
      ['compras', 'proveedores', 'costos']
    ),
    faq('FIN', 21,
      '¿Cómo registro ventas en LogiHub?',
      'Las **ventas** se generan a partir de rubros y servicios confirmados en las órdenes. Consulta el listado de ventas para ver documentos emitidos, pendientes y su relación con cada operación logística.',
      ['ventas', 'ingresos', 'facturación']
    )
  );

  // ── Ecuapass (módulo detectado en prefs) ──
  list.push(
    faq('ORDENES', 30,
      '¿LogiHub tiene integración con Ecuapass?',
      'Sí, cuando el módulo **Ecuapass EDI** está habilitado, la plataforma permite gestionar intercambio electrónico de documentos aduaneros. La disponibilidad y campos específicos dependen de la configuración de tu organización y del tipo de operación.',
      ['ecuapass', 'aduana', 'edi']
    )
  );

  // ── Notificaciones ──
  list.push(
    faq('CONFIG', 10,
      '¿Cómo funcionan las notificaciones en LogiHub?',
      'LogiHub envía alertas por eventos relevantes: tareas asignadas, cambios en órdenes, mensajes nuevos o vencimientos. Puedes configurar si prefieres notificaciones **simples** o **detalladas** según las opciones de tu perfil.',
      ['notificaciones', 'alertas', 'configuración']
    )
  );

  // ── General intro (genérica) ──
  list.unshift(
    faq('INICIO', 1,
      '¿Qué es LogiHub?',
      'LogiHub es una plataforma de gestión logística y comercio exterior que centraliza órdenes, embarques, documentos, tareas, cotizaciones, mensajería y procesos financieros. Permite a importadores, exportadores y operadores logísticos coordinar toda la operación en un solo lugar.',
      ['logihub', 'introducción', 'plataforma']
    )
  );

  return list.filter((f) => !EXISTING.some((re) => re.test(f.question)));
}

async function main() {
  const { auth, user } = await login();
  const orgSpaceId = user.orgSpace?.id || 30;
  const modules = await fetchModules(auth, orgSpaceId);
  await fetchBundles(); // valida acceso a assets

  const faqs = buildAllFaqs(modules);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'app.logihub.com',
    modulesEnabled: modules,
    total: faqs.length,
    skippedExisting: EXISTING.length,
    faqs
  };

  const root = path.join(__dirname, '..', 'data');
  fs.mkdirSync(root, { recursive: true });

  const fullPath = path.join(root, 'logihub-faqs-generated.json');
  const importPath = path.join(root, 'logihub-faqs-import.json');

  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(importPath, JSON.stringify(faqs, null, 2), 'utf8');

  const byCat = {};
  for (const f of faqs) {
    const k = f.category || 'Sin categoría';
    byCat[k] = (byCat[k] || 0) + 1;
  }

  console.log(`OK: ${faqs.length} FAQs → ${importPath}`);
  console.log('Módulos:', modules.join(', '));
  console.log('Por categoría:', JSON.stringify(byCat));
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

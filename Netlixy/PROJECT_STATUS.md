# WiFi Connect — estado del proyecto

**Bloque actual:** FASE 1 — Branding WiFi Connect
**Actualizado:** 07/10/2026

Leyenda: 🟢 completado y comprobado · 🟡 implementado pendiente de prueba real · 🔴 error o bloqueo · ⚪ todavía no iniciado.

## Base PWA

- 🟢 Estructura modular y funciones existentes conservadas
- 🟢 Manifest PWA validado (standalone, iconos y metadatos)
- 🟡 Service Worker (cache shell y estrategia runtime revisadas; falta probar en navegador/offline)
- 🟡 Funcionamiento offline de la app (cache estático preparado; prueba real pendiente)
- 🟡 Instalación como PWA (iOS y Android físicos pendientes)

## Interfaz

- 🟡 Inicio, navegación, formularios QR, redes recientes, notas, ajustes y pantallas de cámara/OCR
- 🟡 Texto OCR editable, bruto visible y controles de copiar/repetir/cambiar foto
- 🟡 Integración visual completa pendiente de ejecución en un navegador

## Wi-Fi e historial anteriores

- 🟢 Permanecen las pruebas automatizadas previas de QR, escapes, validaciones y CRUD simulado de IndexedDB
- 🟡 Escaneo de QR, persistencia IndexedDB recargando navegador y flujos visuales siguen pendientes de dispositivo/navegador

## Cámara/OCR

- 🟢 Motor Tesseract.js 7 + core 7 local ejecutado con una fixture ficticia en prueba real de Node; assets empaquetados localmente
- 🟡 OCR local integrado después de confirmar foto; falta ejecutar el wrapper browser en móvil
- 🟡 OCR desde foto de cámara (flujo integrado; cámara física pendiente)
- 🟡 OCR desde imagen de galería (mismo flujo integrado; navegador móvil pendiente)
- 🟡 Progreso OCR (eventos reales del motor conectados; UI aún sin prueba de navegador)
- 🟡 Cancelación OCR (señal abort y terminate probados con worker mock; navegador/móvil pendiente)
- 🟢 Normalización básica de texto probada: Unicode NFC, saltos de línea y espacios; no cambia O/I/S por números
- 🟢 Parser genérico SSID/contraseña/seguridad: 10 fixtures y OCR real + parser comprobados; sin reglas de operador.
- 🟡 Revisión humana editable y generación QR desde el flujo del parser implementadas; falta revisar visualmente en navegador/dispositivo.
- 🟢 Motor modular de perfiles + detector separados del parser/UI; se puede desactivar con `operatorProfiles: false`.
- 🟢 Fusión conservadora: conserva valores y candidatos genéricos; las reglas solo puntúan, justifican y registran score anterior/posterior.
- 🟢 Perfiles básicos DIGI, Movistar, O2, Telefónica (familia sin atribución automática a Movistar), Orange, Jazztel, Vodafone y Lowi con fixtures sintéticas automatizadas.
- 🟢 Detección desconocida y ambigua, vocabulario de perfil y diagnóstico de reglas cubiertos por test.
- 🟡 Indicador de operador en la pantalla de revisión y diagnóstico de desarrollo implementados detrás de la whitelist local; falta revisión visual con navegador.
- ⚪ Validación de perfiles con routers y fotos reales.

### Decisiones de OCR

- Motor: Tesseract.js 7.0.0 y tesseract.js-core 7.0.0, integrados desde archivos locales.
- Idiomas: `spa+eng`, modelos LSTM `best_int` comprimidos; equilibran precisión con descarga más contenida que los paquetes de datos completos.
- Carga: dinámica al confirmar la fotografía; no carga el motor en Inicio.
- Worker: uno por análisis, terminado al completarlo o cancelarlo; repetir OCR crea uno nuevo. Esto prioriza memoria y estabilidad móvil.
- Preprocesado: normaliza orientación EXIF mediante `createImageBitmap(..., imageOrientation: "from-image")` o decodificación del navegador, conserva color y proporción y reduce solo si supera 2800 px en el lado mayor. JPEG calidad 0,96 para OCR; genera además una miniatura comparativa de hasta 1200 px. No aplica escala de grises ni filtros de contraste/nitidez por defecto.
- Datos: fotografía original y texto no se envían ni se guardan en IndexedDB. El Blob confirmado se mantiene temporalmente y el motor se alimenta del Blob procesado.

## Parser genérico

- 🟢 Extracción de SSID: marcadores frecuentes, etiquetas en línea siguiente, variantes 2.4/5 GHz y tolerancia moderada a `SSlD`.
- 🟢 Extracción de contraseñas: marcadores Wi-Fi/WLAN, WPA/PSK, etiquetas genéricas y símbolos preservados.
- 🟢 Exclusiones: MAC, IP, valores numéricos tipo PIN sin etiqueta Wi-Fi, serial/SN, WPS PIN y credenciales Admin/Web; una clave numérica etiquetada explícitamente como Wi-Fi se conserva para revisión.
- 🟢 Candidatos conservados con score, razón y línea fuente; valores repetidos se consolidan y se ordenan de manera determinista.
- 🟢 Varios SSID con score alto se presentan sin escoger uno silenciosamente; la UI ofrece candidatos y deja corregir el campo.
- 🟢 Seguridad detectada: WPA/WPA2, WPA3/SAE, WEP y red abierta; si falta evidencia, ofrece WPA/WPA2 marcado como asumido.
- 🟢 Confianza heurística por campo expresada como score y etiqueta alta/media/revisar; no representa certeza real.
- 🟡 Pantalla de revisión y generación explícita del QR usando el motor existente; probar interacción real pendiente.
- Las credenciales propuestas no se corrigen por contexto ni se guardan hasta que el usuario las confirme. Las redes confirmadas por este flujo usan `origin` y `source` `router_scan`; no se almacena foto ni texto OCR.

## Reconocimiento por operador

- 🟢 Arquitectura de perfiles y detector independientes.
- 🟢 Detección de operador y fusión con el parser genérico.
- 🟢 Perfil DIGI (fixture sintética automatizada; sin validación física).
- 🟢 Perfil Movistar/O2 (fixtures sintéticas separadas; sin validación física).
- 🟢 Perfil Orange/Jazztel (fixtures sintéticas separadas; sin validación física).
- 🟢 Perfil Vodafone/Lowi (fixtures sintéticas separadas; sin validación física).
- 🟢 Diagnóstico de perfil y scores expuesto en resultado/test; panel visual de desarrollo pendiente de revisión.
- 🟢 Fixtures sintéticas automatizadas por operador y casos desconocido/ambiguo.
- ⚪ Pruebas con etiquetas reales.
- 🟢 Detección prudente: identificadores textuales exactos, coincidencia OCR limitada para `MOVlSTAR`, candidatos múltiples y operador no identificado. Telefónica sola se clasifica como familia, no como Movistar.
- 🟢 Fusión: únicamente aplica reglas explicables de +5 a candidatos genéricos con etiqueta explícita y una detección de confianza media/alta. No crea candidatos ni corrige ni reemplaza SSID/contraseña. La regla suma score por evidencia de etiqueta genérica; no afirma que ese formato sea propio del operador.
- 🟢 Perfiles estructuran vocabulario, etiquetas posibles, pistas positivas/negativas, transformaciones permitidas solo en etiquetas y reglas de score. Sin muestras físicas no se añaden prefijos, longitudes ni layouts específicos.
- 🟢 Se puede comparar parser genérico y perfiles con `parseRouterLabel(data, {operatorProfiles:false})`.
- 🟡 Resumen de operador visible durante revisión y panel técnico local con evidencia y score anterior/posterior; UI sin prueba visual en dispositivo.
- Perfiles implementados no equivalen a formatos de etiqueta verificados; las señales actuales provienen de los casos sintéticos pedidos y vocabulario explícito.

### Fixtures sintéticas automatizadas

- 🟢 DIGI
- 🟢 Movistar
- 🟢 O2 (separado de Movistar)
- 🟢 Orange
- 🟢 Jazztel
- 🟢 Vodafone
- 🟢 Lowi
- 🟢 Operador desconocido
- 🟢 Credencial Admin excluida con marca presente
- 🟢 Vodafone/Lowi ambiguos
- 🟢 Marca con error OCR moderado

### Etiquetas reales

- ⚪ DIGI real
- ⚪ Movistar real
- ⚪ O2 real
- ⚪ Orange real
- ⚪ Jazztel real
- ⚪ Vodafone real
- ⚪ Lowi real



## Validación con etiquetas reales · modo laboratorio (Prompt 6)

- 🟢 Herramientas de diagnóstico puras: dimensiones, orientación normalizada, bytes, OCR, operador, candidatos y razones; sin incluir la foto.
- 🟡 Panel de diagnóstico y comparación OCR/parser vs. datos correctos; falta revisión en navegador.
- 🟢 Comparación exacta de valores y diferencias carácter por carácter, sin autocorrección.
- 🟢 Exportación JSON/texto con opción de ocultar contraseña; las pruebas verifican que la contraseña se redacta también en OCR, candidatos y líneas origen.
- 🟡 Descarga/copia desde navegador y confirmación de privacidad pendientes de prueba real.
- 🟢 Modo laboratorio separado por `?debug=1` y whitelist `DEV_ACCESS.debugHosts`; localhost habilitado, sin host remoto activo por defecto.
- 🟢 Sin guardado automático, base de datos de muestras ni envío de red. Exportar/copiar requiere acción expresa; exportar pide confirmación.
- 🟢 `tests/fixtures/operators-real/README.md` define formato y redacción; no contiene fixtures reales ni inventadas.

### Etiquetas reales

- ⚪ DIGI real
- ⚪ Movistar real
- ⚪ O2 real
- ⚪ Orange real
- ⚪ Jazztel real
- ⚪ Vodafone real
- ⚪ Lowi real

Una muestra solo se considerará validada al registrar OCR, parser, datos correctos finales y diferencias observadas. Fixtures sintéticas no cuentan como etiquetas reales.



## Validación controlada con etiquetas reales (Prompt 7)

- 🟢 Índice `tests/fixtures/operators-real/index.json` creado; muestras reales registradas: **0**.
- 🟢 Archivos locales sensibles (`input.*`, `expected*.json`, `ocr*.txt`, `diagnostic*.json`) excluidos mediante `.gitignore`; documentación de redacción y placeholders añadida.
- 🟢 Comando reproducible `npm run test:fixture -- <id>` compara parser genérico (`operatorProfiles:false`) contra perfiles activados (`true`), ejecuta Tesseract local sobre imagen privada o consume texto local previamente reconocido y oculta credenciales en salida normal. `--show-values` es una opción explícita para terminal privado.
- 🟢 `npm run test:fixture -- --stats` calcula muestras, aciertos operador/SSID/contraseña/seguridad, correcciones y errores OCR/parser por operador; con cero muestras muestra `0/0`, no porcentajes.
- 🟢 Diagnóstico del laboratorio admite clasificación por categoría FOTO/OCR/PARSER/OPERADOR/UI y la incluye solo en la exportación bajo acción del usuario.
- ⚪ No hay muestras analizadas, patrones observados, patrones repetidos, reglas candidatas ni reglas verificadas.
| Operador | Muestra real | Patrón candidato | Regla verificada |
|---|---|---|---|
| DIGI | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| Movistar | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| O2 | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| Orange | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| Jazztel | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| Vodafone | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
| Lowi | ⚪ Ninguna | ⚪ Pendiente | ⚪ Pendiente |
- 🟢 Sin reglas nuevas, aprendizaje, almacenamiento automático ni transmisión de fotos/credenciales.

## Offline OCR

- 🟡 Worker, cargadores JS y binarios WASM (LSTM genérico, SIMD y Relaxed SIMD): versiones locales; worker y binarios comparten directorio para resolver WASM sin URL externa, cacheados por el service worker al solicitarlos.
- 🟡 Idiomas: `eng` y `spa` están dentro del proyecto; Tesseract también conserva datos de idioma localmente en IndexedDB.
- 🟡 Caché: carga diferida; esos archivos grandes no bloquean la instalación ni el inicio. El primer OCR debe ejecutarse con conexión para que el navegador los tenga disponibles offline.
- 🟡 Verificación: la prueba OCR real usó el core y modelos locales sin depender de API externa. No se ha probado un segundo OCR desde navegador desconectado; offline browser permanece sin certificar.



## Acceso seguro a validación remota (Prompt 9)

- 🟢 Activación por host exacto autorizado más el query correspondiente; nombres de subdominio parecidos no coinciden.
- 🟢 Localhost habilitado para validation/debug; cualquier dominio remoto no autorizado permanece en modo normal.
- 🟢 Configuración única en `src/config.js`, listas independientes `DEV_ACCESS.validationHosts` y `DEV_ACCESS.debugHosts`; no hay dominio remoto ficticio habilitado.
- 🟢 Indicador `🧪 Modo validación` y detalles Host/HTTPS/Mode en el panel.
- 🟡 URL HTTPS real pendiente de configurar en whitelist y desplegar.
- ⚪ Validación física iPhone pendiente; no se usaron mocks para marcar estados físicos.

### Validación remota

1. Añadir el hostname exacto a `DEV_ACCESS.validationHosts` (y a `debugHosts` solo si se quiere autorizar el laboratorio aparte) en `src/config.js`.
2. Desplegar el proyecto en ese origen por HTTPS.
3. Abrir `https://HOST/?validation=1` en Safari/iPhone.
4. Ejecutar el checklist físico. La whitelist no desactiva las restricciones seguras del navegador; cámara y Service Worker siguen requiriendo contexto seguro.

`?debug=1` usa su lista independiente. Autorizar validation no autoriza debug, ni al revés.

## Pruebas ejecutadas

- 🟢 `npm test`: QR, cámara simulada, wrapper/preprocesado OCR, 10 regresiones del parser genérico, fixtures sintéticas por perfil, OCR real + parser y diagnóstico laboratorio/redacción, análisis de fixtures reales, modelo de validación física y whitelist de entornos.
- 🟢 CRUD de IndexedDB ejecutado aparte con `fake-indexeddb`; cubrió guardar/leer/listar/editar nota/eliminar/borrar todo. No forma parte de `npm test`.
- 🟢 OCR real + parser con fixture sin marca: propuso `TEST_WIFI_5G`, `Test12345678` y WPA/WPA2; operador permaneció null (confianza OCR 73,0%).
- 🟢 Perfiles: pruebas sintéticas para DIGI, Movistar, O2, Orange, Jazztel, Vodafone, Lowi, desconocido, ambigüedad, Admin, ON/OFF y score antes/después.
- 🟢 Laboratorio: activación local, comparación, diff O/0, exportación JSON/texto, contraseña visible/oculta y ausencia de imagen/base64.
- 🟢 Infraestructura de muestra real: índice vacío verificado, estadísticas sin muestras, comparación profiles ON/OFF y clasificación de fallos.
- 🟢 Wrapper mock: resultado estructurado, estados/progreso, terminación al cancelar, confianza y limpieza.
- 🟢 Preprocesado mock: orientación `from-image`, dimensiones, reducción 4000×2000 → 2800×1400 y vista comparativa.
- 🟢 Sintaxis JS comprobada con `node --check`.
- 🟡 Sin proceso de build configurado: PWA estática; se comprobó sintaxis y suite npm.



## VALIDACIÓN FÍSICA · iPhone (Prompt 8)

La lista siguiente es exclusivamente manual. Todos los estados empiezan ⚪ y solo deben cambiarse tras probar en un dispositivo real. Los mocks no cuentan como pruebas físicas.

### Safari
- ⚪ Abrir aplicación en Safari
- ⚪ Navegación Inicio / Recientes / Ajustes
- ⚪ Generar QR manual
- ⚪ Guardar red
- ⚪ Añadir nota
- ⚪ Editar nota
- ⚪ Cerrar Safari y volver a abrir
- ⚪ Persistencia IndexedDB

### Cámara
- ⚪ Solicitar permiso
- ⚪ Cámara trasera
- ⚪ Preview correcta
- ⚪ Capturar fotografía
- ⚪ Repetir fotografía
- ⚪ Confirmar fotografía
- ⚪ Abandonar pantalla detiene cámara

### Fotos
- ⚪ Seleccionar foto desde galería
- ⚪ Foto vertical
- ⚪ Foto horizontal
- ⚪ Orientación correcta

### OCR
- ⚪ Iniciar OCR
- ⚪ Mostrar progreso
- ⚪ Cancelar OCR
- ⚪ Repetir OCR
- ⚪ Obtener texto real
- ⚪ Revisar resultado

### Parser
- ⚪ Detectar SSID
- ⚪ Detectar contraseña
- ⚪ Detectar seguridad
- ⚪ Mostrar varios candidatos si existen
- ⚪ Corrección manual

### QR final
- ⚪ Generar QR tras revisión
- ⚪ Visualizar QR correctamente
- ⚪ Compartir QR
- ⚪ Escanear QR con otro teléfono
- ⚪ Conexión real a Wi-Fi

### PWA instalada
- ⚪ Añadir a pantalla de inicio
- ⚪ Abrir en modo standalone
- ⚪ Navegación correcta
- ⚪ Cámara desde PWA
- ⚪ OCR desde PWA
- ⚪ IndexedDB persistente

### Offline
- ⚪ Abrir PWA sin Internet
- ⚪ Navegación offline
- ⚪ Generar QR offline
- ⚪ Abrir redes recientes offline
- ⚪ OCR offline después de haber descargado recursos

- 🟢 Herramienta local `?validation=1`, checklist de 46 pruebas con estados/notas/incidencias, capacidades del navegador, exportación JSON segura y copia de informe; pruebas automatizadas pasadas.
- 🟡 Interfaz y capacidades requieren ejecución en el iPhone real. El entorno actual no proporciona un iPhone conectado. La whitelist remota todavía está vacía; `src/config.js` permite autorizar una URL HTTPS de desarrollo antes de desplegarla.

## Pruebas manuales en móvil

### Cámara (Prompt 2)

- ⚪ Safari iPhone — solicitar permiso
- ⚪ Safari iPhone — cámara trasera
- ⚪ Safari iPhone — realizar foto
- ⚪ Safari iPhone — repetir foto
- ⚪ Safari iPhone — confirmar foto
- ⚪ Safari iPhone — elegir desde Fotos
- ⚪ Safari iPhone — orientación correcta
- ⚪ Safari iPhone — abandonar pantalla detiene cámara
- ⚪ PWA instalada — cámara
- ⚪ Android Chrome — cámara

### OCR (Prompt 3)

- ⚪ OCR foto tomada con iPhone
- ⚪ OCR foto seleccionada desde Fotos
- ⚪ SSID legible en etiqueta real
- ⚪ Contraseña legible en etiqueta real
- ⚪ Foto vertical
- ⚪ Foto horizontal
- ⚪ Etiqueta con poca luz
- ⚪ Cancelar OCR
- ⚪ Repetir OCR
- ⚪ OCR funcionando desde PWA instalada
- ⚪ OCR funcionando offline

### Parser/QR (Prompt 4)

- ⚪ Router real DIGI
- ⚪ Router real Movistar/O2
- ⚪ Router real Orange/Jazztel
- ⚪ Router real Vodafone/Lowi
- ⚪ Dos SSID 2.4/5 GHz en etiqueta física
- ⚪ Contraseña con símbolos en etiqueta física
- ⚪ Contraseña ambigua O/0
- ⚪ Etiqueta con Admin Password
- ⚪ Etiqueta con WPS PIN
- ⚪ Generar QR después de revisar en móvil
- ⚪ Conexión real al escanear el QR generado

Estas pruebas siguen pendientes; fixtures sintéticas y mocks no equivalen a prueba física.

## Problemas / límites comprobados

- 🟡 El entorno no dispone de navegador/dispositivo real para probar la integración browser, Safari/iOS u offline.
- 🟡 La primera descarga/carga de idiomas puede tardar varios segundos y usa memoria notable, especialmente con ambos idiomas. Se finaliza el worker después de cada ejecución.
- 🟡 Si se cancela durante la carga inicial del worker, la pantalla vuelve de inmediato y el worker se termina en cuanto termina su inicialización; Tesseract no expone una cancelación previa a esa inicialización.

## Siguiente fase

Probar fotografías reales de etiquetas y convertir únicamente patrones confirmados en reglas verificadas. La arquitectura existe; todavía no hay reglas de formato validadas en router real.

## Despliegue HTTPS para validación física (Prompt 10)

- ⚪ HTTPS desplegado — no existe un hostname real de Netlixy publicado. El proyecto no contiene configuración de hosting ni repositorio remoto; no se ha creado ni inventado una URL.
- ⚪ Host remoto añadido a `DEV_ACCESS.validationHosts` — pendiente de obtener el hostname exacto del despliegue.
- 🟢 `DEV_ACCESS.debugHosts` conserva solo `localhost`, `127.0.0.1` y `::1`; ningún host remoto está autorizado para `?debug=1`.
- ⚪ Manifest publicado.
- ⚪ Service Worker publicado.
- ⚪ Recursos OCR publicados y respuestas/MIME verificados en hosting.
- 🟢 Recursos locales del manifest, APP_SHELL y carga diferida OCR existen; comprobación local de rutas completada.
- 🟢 Suites automatizadas del proyecto pasadas, incluidos tests whitelist (local/remoto autorizado, host ajeno, query ausente y debug separado).
- ⚪ Acceso remoto `?validation=1` comprobado en navegador.
- ⚪ Acceso remoto `?debug=1` rechazado en navegador.

La aplicación ya está formada por recursos estáticos y no requiere backend. Para completar el despliegue falta vincular este proyecto a un hosting estático HTTPS con un origen estable y publicar estos archivos. Después se añadirá únicamente el `location.hostname` devuelto a `validationHosts`, se incrementará la caché del Service Worker y se volverán a desplegar los archivos. No cambiar `debugHosts`. Las 46 pruebas físicas del checklist anterior permanecen ⚪ hasta ejecutarlas en un iPhone real.

## Netlixy: GitHub Pages (Prompt 11)

- 🟢 Marca visible cambiada a `Netlixy`: título/cabecera, Inicio, Ajustes, manifest, informes, exportaciones y nombre del paquete. El eslogan se retiró de la pantalla Inicio.
- 🟢 README breve y workflow mínimo de GitHub Pages preparados. El workflow publica únicamente HTML, CSS, módulos, iconos y vendor estáticos; excluye tests y dependencias de desarrollo.
- 🟢 `.gitignore` excluye `node_modules`, `dist`, archivos de entorno y muestras locales/sensibles. No existen muestras reales en `tests/fixtures/operators-real`; solo fixtures sintéticas de test.
- 🟢 Rutas PWA relativas verificadas para servir desde `/Netlixy/`: enlaces de HTML, `start_url`, `scope`, registro del Service Worker, precache y rutas Tesseract derivadas de `import.meta.url`.
- 🟢 Validación remota preparada para exigir hostname autorizado Y ruta exacta; el subdirectorio `/Netlixy/` no se ha autorizado antes de confirmar el despliegue. `validationHosts` continúa limitado a hosts locales y `validationPaths` vacío. `debugHosts` sigue local únicamente.
- 🟢 Service Worker usa `netlixy-v1.9.0`; al activar elimina cachés antiguas `wifi-connect-*`/`netlixy-*` de esta app y conserva otras cachés del mismo origen. No modifica IndexedDB.
- 🟡 GitHub: la sesión web disponible está cerrada y el conector solo tiene permisos de lectura. No se ha creado el repositorio ni subido el proyecto.
- ⚪ Visibilidad del repositorio y disponibilidad de Pages para repositorio privado: pendiente de verificar desde la cuenta autorizada. No se ha hecho público el código.
- 🟡 Condición de publicación: GitHub Pages puede usar un repositorio privado con ciertos planes; la web publicada sigue siendo pública salvo publicación privada de Enterprise. El plan de `faroma30` todavía no se ha comprobado.
- ⚪ GitHub Pages, hostname HTTPS, validación remota y comprobaciones HTTP/MIME: pendientes hasta crear el repositorio y publicar.
- ⚪ Las 46 pruebas físicas siguen sin probarse.

El repositorio previsto es `Netlixy` en la cuenta `faroma30`, indicada en la configuración GitHub previamente usada por el usuario. Para terminar el acceso externo, hace falta iniciar sesión en GitHub en el navegador de trabajo y confirmar que la cuenta correcta está seleccionada. Se creará privado primero; si Pages no está disponible de forma compatible con esa visibilidad, se detendrá antes de exponer el repositorio.

## UI / Restyling (2026-10-07)

- 🟢 Sistema visual oscuro con acento azul eléctrico, tarjetas redondeadas, foco visible y navegación inferior renovada.
- 🟢 Inicio rediseñado con accesos a escáner, generación manual, Mi red Wi-Fi y vista compacta de redes guardadas con sus notas.
- 🟢 Formularios rediseñados con campos oscuros y controles táctiles amplios; se conserva la entrada manual y el pegado disponible.
- 🟢 QR generado rediseñado con código destacado, SSID, seguridad, contraseña según el comportamiento actual y nota identificativa.
- 🟢 Recientes rediseñado conservando SSID, nota, fecha y acciones existentes.
- 🟢 Ajustes rediseñados sin añadir preferencias ficticias; muestran privacidad local, borrado existente y versión actual.
- 🟢 Copiar datos copia SSID, contraseña y seguridad en formato legible; Clipboard API con fallback de selección y confirmación breve.
- 🟡 Validación visual en iPhone pendiente.
- 🟡 PWA instalada pendiente de revisar.
- ⚪ Ajustes finales tras uso real pendientes.
- ⚪ Ninguna prueba física se marca como realizada.
## UI / Restyling (2026-10-07)

- 🟢 Sistema visual oscuro con acento azul eléctrico, tarjetas redondeadas, foco visible y navegación inferior renovada.
- 🟢 Inicio rediseñado con accesos a escáner, generación manual, Mi red Wi-Fi y vista compacta de redes guardadas con sus notas.
- 🟢 Formularios rediseñados con campos oscuros y controles táctiles amplios; se conserva la entrada manual y el pegado disponible.
- 🟢 QR generado rediseñado con código destacado, SSID, seguridad, contraseña según el comportamiento actual y nota identificativa.
- 🟢 Recientes rediseñado conservando SSID, nota, fecha y acciones existentes.
- 🟢 Ajustes rediseñados sin añadir preferencias ficticias; muestran privacidad local, borrado existente y versión actual.
- 🟢 Copiar datos copia SSID, contraseña y seguridad en formato legible; Clipboard API con fallback de selección y confirmación breve.
- 🟡 Validación visual en iPhone pendiente.
- 🟡 PWA instalada pendiente de revisar.
- ⚪ Ajustes finales tras uso real pendientes.
- ⚪ Ninguna prueba física se marca como realizada.
## UI / Corrección según Estilo.png (2026-10-07)

- 🟢 Referencia `Estilo.png` inspeccionada directamente; usada para composición, contraste, iconografía, proporción y navegación.
- 🟢 Inicio recompuesto con marca Wi-Fi centrada, escaneo principal ancho, cuadrícula de cuatro accesos funcionales y filas recientes compactas.
- 🟢 Formulario de Mi red/Generar QR con cabecera centrada, controles oscuros, iconos lineales y acción principal azul luminosa.
- 🟢 QR generado con marco claro, datos centrados, acciones Guardar/Compartir/Copiar y confirmación verde discreta.
- 🟢 Ajustes agrupados y navegación inferior con acción central conectada al escaneo de router.
- 🟡 Validación visual física en iPhone pendiente.
- 🟡 Revisión de PWA instalada pendiente.
- ⚪ Ajustes finales tras uso real pendientes.
- ⚪ Ninguna prueba física se marca como realizada.

## UI / Ajustes tras captura real (2026-10-07)

- 🟢 En móvil, el lienzo ocupa el viewport sin marco ni ancho máximo; navegación integrada con safe area inferior.
- 🟢 Cabecera compactada; estado vacío de Recientes reducido; cuadrícula de acciones más baja y legible.
- 🟢 Escanear router más destacado, con icono ampliado y glow cian discreto; acción enlazada al flujo real.
- 🟢 Escritorio presenta una vista compacta de hasta 430 px con navegación dentro del panel.
- 🟡 Viewports 390×844, 393×852 y 430×932 revisados en navegador responsive; revisión física en iPhone pendiente.

## UI / Escáner único en Inicio (2026-10-07)

- 🟢 Eliminada la tarjeta duplicada Escanear router de Inicio; el botón central inferior conserva el acceso al flujo de escaneo existente.
- 🟢 Inicio mantiene únicamente cuatro acciones en cuadrícula 2×2; recientes queda más próximo a las acciones y sin relleno ficticio.
- 🟢 Botón central centrado en su columna y alineado dentro de la barra inferior con safe area y glow discreto.
- 🟢 Caché del Service Worker actualizada a netlixy-v1.11.2; se conserva la limpieza de cachés anteriores.
- 🟡 Revisión visual iPhone física pendiente.


## FASE 1 — Branding (2026-10-07)

- 🟢 Nombre visible actualizado a `WiFi Connect` en Inicio, Ajustes, validación, informes, laboratorio, título y metadatos de instalación.
- 🟢 Manifest actualizado con nombre, nombre corto y descripción de WiFi Connect.
- 🟢 Ajustes muestra `WiFi Connect` y `V1.14.1`, usando `APP_VERSION` como única fuente de verdad visible y en informes.
- 🟢 README actualizado al nombre y descripción del producto.
- 🟢 Service Worker/caché actualizado a `wifi-connect-v1.14.1`; activa limpieza compatible con cachés `netlixy-*` y `wifi-connect-*`.
- 🟡 PWA instalada pendiente de comprobar en iPhone.
- 🟡 Nombre antiguo de repositorio/URL mantenido temporalmente por compatibilidad: `faroma30/Netlixy`, `/Netlixy/`.
- ⚪ IndexedDB y sus identificadores internos se conservan sin migración; el nombre heredado del proyecto/paquete también se mantiene como identificador técnico.

## FASE 2 — Recientes / Guardadas (2026-10-07)

- 🟢 Modelo IndexedDB versión 2: los registros antiguos se recorren durante la actualización y se marcan como `saved`, conservando identificador, credenciales, nota y fechas.
- 🟢 Recientes se crean tras confirmar datos del escáner/OCR y al generar manualmente un QR; caducan a las 48 horas exactas desde `lastUsedAt`.
- 🟢 Abrir el detalle, volver a mostrar el QR o copiar la contraseña renueva las 48 horas; la lista no renueva el plazo.
- 🟢 Dedupe temporal por SSID y seguridad; una revisión actualiza el registro reciente existente. Las credenciales guardadas no se modifican al detectar otra contraseña.
- 🟢 Guardar promueve el reciente existente. Si ya hay una red guardada con otras credenciales, la interfaz pide confirmación antes de reemplazarlas y conserva una sola entrada guardada.
- 🟢 Redes muestra pestañas independientes Recientes y Guardadas, accesibles desde Inicio. Borrar recientes y borrar guardadas son acciones separadas.
- 🟢 La limpieza de caducadas se ejecuta al iniciar la aplicación y al acceder a las listas/datos, sin procesos en segundo plano.
- 🟢 Pruebas con reloj inyectado: 47 h 59 min permanece; 48 h 01 min se elimina. Cubren CRUD IndexedDB simulado, migración desde versión 1, duplicados, renovación, promoción, conflictos y borrado por categoría.
- 🟢 `APP_VERSION` actualizado a `V1.15.0`; caché Service Worker a `wifi-connect-v1.15.0`, con limpieza compatible `wifi-connect-*`/`netlixy-*`.
- 🟡 Validación física en iPhone pendiente.
- ⚪ Validación física en Android pendiente.

## Muestra Orange Livebox 6 — validación física local (2026-10-07)

- 🟢 La foto `orange-livebox6-real-001/input.local.jpg` se conserva solo localmente e ignorada por Git; no se versionaron imagen, transcripción ni credenciales.
- 🟢 Tesseract real `spa+eng`, tras el preprocesado actual, recuperó el SSID exacto y la etiqueta/clave Wi-Fi en el pase gris/contraste. Confianza combinada 83%; OCR completo 3015 ms.
- 🟡 El pase en color añadió una palabra al SSID; el pase gris obtuvo el valor exacto. La fusión mantiene ambos candidatos y exige revisión humana.
- 🟢 Orange se identifica por texto explícito `Orange Espagne`; confianza media. `Livebox 6` por sí solo no infiere operador.
- 🟢 El lector QR local jsQR decodificó el QR como payload Wi-Fi estándar en 599 ms; los datos coinciden con los candidatos OCR exactos. Coste OCR + QR: 3614 ms en esta ejecución.
- 🟢 Seguridad WPA/WPA2 está indicada por el payload QR; el parser OCR solo la asumiría si no hubiera dato explícito. La etiqueta no expresa bandas y no se propusieron 2.4 ni 5 GHz.
- 🟢 Las etiquetas españolas sin dos puntos se reconocen sin alterar sus valores; si otro pase OCR entrega un SSID distinto, la discrepancia permanece visible para revisión.
- 🟡 Compatibilidad física Safari iPhone / Chrome Android pendiente de validar en dispositivos.
- 🟢 `APP_VERSION` actualizado a `V1.17.2`; Service Worker a `wifi-connect-v1.17.2`, con limpieza compatible de cachés antiguas.

## FASE 3 — Red detectada (2026-10-07)

- 🟢 Revisión humana de SSID, contraseña y seguridad sigue siendo obligatoria; al confirmar, la red aparece en Recientes o reutiliza la ya guardada.
- 🟢 El detalle compartido muestra Red detectada, contraseña oculta, Copiar contraseña, Mostrar QR, copiar SSID, nota editable y el tiempo restante.
- 🟢 Copiar contraseña, abrir el detalle y Mostrar QR renuevan las 48 horas de Recientes; las notas se escriben en el registro sin promoverlo.
- 🟢 Guardar promueve el registro temporal existente y quita la caducidad; conserva la nota. El conflicto de contraseña con una red Guardada solicita confirmación antes de usar la credencial guardada o mantener la recién revisada como Reciente.
- 🟢 QR usa el motor actual y vuelve a Red detectada al abrirse desde el detalle.
- 🟢 Detalle reutilizado desde Recientes y Guardadas; las redes permanentes no se duplican cuando se reconocen sus credenciales actuales.
- 🟢 `APP_VERSION` actualizado a `V1.16.0`; Service Worker a `wifi-connect-v1.16.0`, conservando la limpieza de cachés antiguas.
- 🟡 Validación física en iPhone pendiente.
- ⚪ Validación física en Android pendiente.

## Etiquetas reales — Huawei EchoLife EG8145V5 (2026-10-07)

- 🟢 Primera muestra real analizada a partir de la transcripción textual facilitada de una fotografía física; la imagen no se incluye en el repositorio.
- 🟢 El parser reconoce `SSID1`/`SSID2` y tolera `SSIDI`/`SSIDl`; conserva ambos candidatos para que la persona elija la banda.
- 🟢 `WLAN Key` y variantes OCR moderadas tienen prioridad como contraseña Wi-Fi; `password:adminHW` en contexto de `username:root` se excluye como credencial administrativa.
- 🟢 La seguridad queda como WPA/WPA2 asumida cuando no aparece indicada; operador permanece desconocido/no identificado.
- 🟡 Repetir OCR físico en iPhone con la fotografía original pendiente; sin la imagen no se ha verificado la salida real de Tesseract.
- 🟢 `APP_VERSION` actualizado a `V1.16.1`; Service Worker a `wifi-connect-v1.16.1`, conservando la limpieza de cachés antiguas.

## Optimización OCR — validación física Huawei (2026-10-07)

- 🟢 Pase color real recupera la contraseña Wi-Fi correcta mediante `WLAN Key`, pese al ruido antes de la etiqueta.
- 🟢 Pase color conserva SSID2 correctamente; pase alternativo en gris/contraste encuentra SSID1 como candidato incierto y el selector indica `Revisa este dato`.
- 🟢 La credencial administrativa leída parcialmente por el segundo pase se excluye usando el contexto cercano de usuario/IP de gestión; contraseña genérica tiene menor prioridad que etiquetas Wi-Fi explícitas.
- 🟢 Fusión conserva líneas/candidatos con origen, texto y confianza por pase; el pase gris/contraste solo corre cuando el primero es débil o incompleto.
- 🟡 SSID1 todavía no se reconoce exactamente como está impreso; no se reconstruye por similitud y requiere revisión/corrección humana.
- 🟡 OCR + parser end-to-end deja usable la red de 5 GHz y la contraseña, pero el SSID de 2.4 GHz aún necesita revisión humana.
- ⚪ Recorte central experimental descartado: bajó la confianza y perdió SSID1; no se codifican coordenadas de esta etiqueta en producción.
- 🟢 `APP_VERSION` actualizado a `V1.16.2`; Service Worker a `wifi-connect-v1.16.2`, conservando limpieza de cachés antiguas.

## FASE 4 — Revisión OCR inteligente (2026-10-07)

- 🟢 Interpretación de bandas 2.4/5 GHz solo dentro de valores SSID etiquetados; `24GAMES` no se interpreta como banda.
- 🟢 Emparejamiento genérico de SSID por prefijo, sufijo y banda explícita, sin reglas por marca.
- 🟢 Reconstrucción contextual conserva valor bruto, propuesta, fragmento corregido, score, confianza y motivo; queda marcada para revisión humana.
- 🟢 La pantalla de revisión distingue propuesta/revisión y etiqueta 2.4 GHz / 5 GHz; dos bandas requieren elección explícita.
- 🟢 Nota rápida ya se guarda al editar Reciente y se conserva al promover a Guardada (implementado en Fase 3; verificado, sin duplicar lógica).
- 🟡 Huawei 2.4 GHz: OCR bruto sigue siendo dudoso; el parser propone `HUAWEI-2.4G-28bi` por contexto y exige revisión humana.
- 🟢 Huawei 5 GHz y WLAN Key recuperados desde fotografía local mediante OCR real.
- 🟡 Pase OCR focalizado por región/PSM no integrado; la prueba de navegador no produjo salida medible. No se afirma mejora del motor OCR.
- 🟢 `APP_VERSION` actualizado a `V1.17.0`; Service Worker a `wifi-connect-v1.17.0`, con limpieza compatible de cachés anteriores.
- 🟡 Validación física en iPhone pendiente, en especial selección de banda y SSID 2.4 GHz propuesto.
- ⚪ Validación física en Android pendiente.

## FASE 5 — Navegación y preparación Android (2026-10-07)

### Navegación
- 🟢 Recientes desde Inicio abre Redes con la pestaña Recientes seleccionada; la lista excluye vencidas mediante IndexedDB.
- 🟢 Guardadas desde Inicio abre Redes con Guardadas seleccionada; el contador consulta los registros permanentes en IndexedDB.
- 🟢 Ambas tarjetas muestran el recuento dinámico y siguen navegando cuando están vacías.
- 🟢 Abrir una red desde cualquiera de las pestañas y volver regresa a Redes conservando la pestaña activa.
- 🟢 Barra inferior: Inicio, Escanear, Redes y Ajustes; Redes usa su icono Wi-Fi y el escáner permanece centrado en 50% del ancho de la barra, con safe area.

### Escáner y diagnóstico
- 🟢 Huawei y Orange: funcionamiento físico en iPhone comunicado y validado por el usuario; no se modificaron OCR, parser ni fusión.
- 🟢 Diagnóstico de sesión en modo validación: entorno, cámara/permisos, foto, QR, pases OCR, candidatos, reconstrucción, fuente, duración y error técnico sanitizado. Incluye ver, copiar y limpiar.
- 🟢 Los diagnósticos compartibles excluyen SSID, contraseñas, imágenes y texto OCR; no se transmiten a servidores.

### Android físico · pendiente
- ⚪ Chrome, navegación, Inicio → Recientes/Guardadas y retorno desde detalle.
- ⚪ Cámara trasera, permiso, captura, galería y orientación.
- ⚪ OCR local, QR jsQR, Huawei 2.4/5 GHz, Orange Livebox 6 y pantalla Red lista.
- ⚪ Copiar contraseña, Recientes 48 h, promoción a Guardadas y caducidad.
- ⚪ Instalar/abrir PWA y prueba offline.
- ⚪ Diagnóstico desde Android; los 23 pasos específicos quedan disponibles en el checklist de validación.

- 🟢 `APP_VERSION` actualizado a `V1.20.0`; Service Worker a `wifi-connect-v1.20.0`, conservando la limpieza de cachés antiguas.

## Rediseño visual definitivo — referencia `Estilo.png` (2026-10-08)

- 🟢 `Estilo.png` se conserva dentro del proyecto y queda documentada como referencia visual oficial de WiFi Connect.
- 🟢 Inicio tiene una acción principal Generar QR, contadores dinámicos basados en las listas IndexedDB y una vista compacta de hasta tres Recientes con acceso a su detalle.
- 🟢 Elección de banda, Red lista, Redes, formulario QR, QR generado, Ajustes, cámara, revisión, errores, validación y laboratorio usan el mismo sistema oscuro azul/cian.
- 🟢 Barra inferior con cuatro destinos reales, acción de escáner centrada geométricamente y safe area; se conserva el flujo de navegación.
- 🟡 Comparación visual publicada y pruebas físicas en iPhone/Android pendientes de repetir con esta entrega.
- 🟢 margen heredado de la barra inferior corregido para mantener el botón del escáner centrado en el viewport. `APP_VERSION` actualizado a `V1.21.2`; Service Worker a `wifi-connect-v1.21.2`, con limpieza de cachés anteriores y el nuevo CSS incluido en la app shell.

## Corrección visual estricta de Inicio — referencia `Estilo.png` (2026-10-08)

- 🟢 Inicio se ajusta a la composición aprobada: cabecera más compacta, Generar QR luminoso, tarjetas verticales de Recientes/Guardadas con contadores consultados en IndexedDB.
- 🟢 Se añadieron ondas ambientales ligeras solo al fondo de Inicio; filas recientes y estado vacío conservan datos reales y acciones existentes.
- 🟢 La barra inferior separa mejor Inicio, Redes y Ajustes; el botón Escanear mantiene el centro geométrico del viewport.
- 🟡 Revisión visual de producción en tamaños de navegador completada; la captura de iPhone mencionada no estaba adjunta en esta solicitud, por lo que no se declara comparación física lado a lado.
- 🟡 Pendiente repetir comprobación física en iPhone.
- 🟢 `APP_VERSION` actualizado a `V1.21.4`; Service Worker a `wifi-connect-v1.21.4`, conservando la limpieza de cachés antiguas.

## Corrección final de barra inferior — V1.21.5 (2026-10-08)

- 🟢 Causa del recorte: Ajustes ocupaba una sola pista estrecha de una cuadrícula de diez columnas; su etiqueta excedía el ancho asignado en móviles.
- 🟢 Barra móvil redistribuida con pistas más amplias, zona de Ajustes extendida y controles con área táctil mínima de 44×44 px.
- 🟢 Escanear continúa anclado a `left: 50%` y `translateX(-50%)`, separado de las pistas laterales y respetando la safe area existente.
- 🟢 Capturas de producción en 375×812, 390×844, 393×852 y 430×932: los cuatro accesos se ven completos y el escáner permanece centrado mediante `left: 50%` y `translateX(-50%)`.
- 🟢 Inicio, Redes, Ajustes y apertura de la pantalla Escanear respondieron a clic en el navegador.
- 🟡 El navegador in-app no expone rectángulos DOM para medición directa; el centro se comprobó con la regla CSS y las capturas de cada viewport.
- 🟡 Validación física iPhone pendiente.
- 🟢 `APP_VERSION` actualizado a `V1.21.5`; Service Worker a `wifi-connect-v1.21.5`, con limpieza de cachés antiguas.

## Etiquetas catalanas — Vera real (2026-10-09)

- 🟢 La fotografía local Vera se procesa con el mismo `analyzeRouterImage()` de cámara y galería, Tesseract `spa+eng`, preprocesado y parser; el OCR lee la red y `Contrasenya WPA`, con el valor en la línea siguiente.
- 🟢 El parser reconoce etiquetas catalanas para nombre de red y contraseña, en la misma línea o en líneas separadas, con tolerancia limitada a confusiones OCR de etiqueta y sin editar el valor reconocido.
- 🟢 Si falta el rótulo SSID en OCR, una cadena con forma de nombre de red junto a una etiqueta Wi-Fi explícita se propone por contexto; se mantiene sin banda inventada. La etiqueta WPA proporciona seguridad explícita.
- 🟢 E2E local real: Vera llega a Red lista y se registra como Reciente antes de mostrarla; Huawei conserva 2.4/5 GHz y excluye credencial administrativa; Orange conserva QR/OCR coincidentes y no infiere banda.
- 🟢 Diagnósticos conservan etapa, pases y motivos sanitizados de OCR/parser sin SSID ni contraseñas en los informes compartibles.
- 🟡 Repetición física de Vera en iPhone pendiente; no se marca como validada en dispositivo físico.
- 🟢 `APP_VERSION` actualizado a `V1.21.9`; Service Worker a `wifi-connect-v1.21.9`, conservando limpieza de cachés antiguas.

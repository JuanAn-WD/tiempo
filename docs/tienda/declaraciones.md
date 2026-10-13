# Declaraciones para las tiendas

Notas internas para Juan Antonio López. No van a la landing. Las páginas públicas están en [`docs/es/`](../es/privacidad.md) y [`docs/en/`](../en/privacy.md).

Describen el binario que junta esta rama (Apartag) con la PR #4 (desbloqueos de emergencia y modo estricto): sin cuenta, sin servidor, sin analítica, sin compras. Los desbloqueos (3, se recupera 1 cada 30 días sin fecha garantizada, cuenta atrás de 5 minutos con la pantalla encendida) y el modo estricto opcional funcionan solo en el teléfono y no cambian ninguna respuesta de privacidad. Si más adelante se añade analítica, `expo-updates`, un SDK de fallos o un pago, hay que rehacer Data safety y la etiqueta de Apple.

Los textos **[PENDIENTE: …]** hay que rellenarlos antes de enviar la ficha.

---

## 1. Google Play · Seguridad de los datos (Data safety)

Ruta: Play Console → Supervisar y mejorar → Contenido de la app → Seguridad de los datos.

Google cuenta como «recogido» lo que sale del teléfono hacia el desarrollador o hacia un tercero. Lo que se procesa solo en el teléfono y no se transmite no se declara. Apartag no tiene llamadas de red en su código (`src/` no usa `fetch` ni un SDK de analítica, fallos o anuncios). No está `expo-updates` ni `expo-insights`.

| Pregunta de la consola | Respuesta |
|---|---|
| ¿Tu app recoge o comparte alguno de los tipos de datos de usuario obligatorios? / Does your app collect or share any of the required user data types? | **No** |
| ¿La app contiene anuncios? | **No** |
| ¿La app usa el ID de publicidad? | **No** |
| URL de la política de privacidad | **[PENDIENTE: URL pública de docs/es/privacidad.md]** |
| ¿Los usuarios pueden crear una cuenta? | **No.** No hace falta la URL de eliminación de cuenta |
| Acceso a la app (credenciales para el revisor) | Todas las funciones están disponibles sin inicio de sesión |

Con «No» en la primera pregunta, la consola no pide tipos de datos, cifrado en tránsito ni mecanismo de borrado. No marques tipos «por si acaso»: sería falso, porque esos datos no se envían.

Si un revisor pregunta por categorías concretas, la respuesta sigue siendo que no se recogen ni se comparten:

| Categoría de Play | Qué hace la app en el teléfono | ¿Se declara? |
|---|---|---|
| Información personal | No pide nombre, correo ni teléfono. La etiqueta del QR de emparejar es el texto «apartag.» | No |
| Ubicación | No se usa | No |
| Información financiera | Esta versión no tiene compras | No |
| Fotos o vídeos | La cámara lee un QR en memoria. No hay acceso a la galería ni `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` | No |
| Audio | `recordAudioAndroid` está en false | No |
| Contactos, calendario, archivos | No se usan | No |
| Actividad en apps / apps instaladas | La lista de apps con icono de lanzador se lee para que el usuario elija. Se guarda la selección (nombres de paquete). El acceso de uso mira la app en primer plano para taparla. El módulo nativo puede anotar en local el nombre de la app bloqueada y la hora del intento. El historial de sesiones (con la marca «Emergencia» si terminó así) y el contador de desbloqueos de emergencia se guardan en AsyncStorage. Nada de eso se sube | No |
| Historial de navegación | No | No |
| Información y rendimiento de la app (fallos, diagnósticos) | No hay SDK de fallos. Los informes que Play genera si el usuario comparte diagnósticos con Google son de la tienda, no una recogida de Apartag | No |
| Identificadores del dispositivo | No hay ID de publicidad ni identificador de cuenta. El UID del tag NFC y, si existe, el del segundo tag (llave de repuesto) se guardan solo en el teléfono | No |

Nota para el campo de revisión, si hace falta (inglés):

```
Apartag is an on-device focus app. It has no account, no backend, and no analytics SDK.
The installed-app list, NFC tag ids, Screen Time selection, session history, and the
emergency-unlock counter stay in app-private storage and are never transmitted to the
developer. On Android, this build sets allowBackup to false, so Auto Backup does not
copy or restore app data. A backup uploaded before this build may still exist.
On iPhone, AsyncStorage excludes its directory from iCloud backup. Camera frames
are used only to decode a QR code and are not saved.
Please treat Data safety as "no data collected".
```

El perfil `production` de `eas.json` sigue generando APK. Play exige un AAB: eso es otra tarea, anterior a usar estas respuestas en una ficha de producción.

No envíes a producción un binario del perfil `development` o `preview`. Esos perfiles llevan cliente de desarrollo y pueden hablar con un servidor de Metro en la red local.

---

## 2. Google Play · Permisos

Tras el prebuild, el manifiesto fusionado pide más de lo que lista `app.json`. `app.json` declara NFC, vibración y cámara. El resto lo añade `expo-app-blocker@0.1.77` (plugin `plugin/src/index.js` y `android/src/main/AndroidManifest.xml` de esa versión).

| Permiso | ¿Se usa? | Para qué | Qué hay que declarar |
|---|---|---|---|
| `CAMERA` | Sí | Leer el QR de la llave | Permiso normal. No es la declaración de fotos y vídeos: no se lee la galería |
| `NFC` | Sí | Leer el UID del tag | Permiso normal |
| `VIBRATE` | Sí | Respuesta háptica | Permiso normal |
| `SYSTEM_ALERT_WINDOW` | Sí | Overlay a pantalla completa sobre la app bloqueada | El usuario lo concede en Ajustes («mostrar sobre otras apps»). No es accesibilidad. No hay formulario propio de overlay |
| `PACKAGE_USAGE_STATS` | Sí | Saber qué app está en primer plano (`UsageStatsManager`) | Permiso especial. Divulgación clara en la app y justificación de funcionalidad principal. Ver el texto de abajo |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` | Sí | `AppBlockerService`, tipo `specialUse` | Declaración de servicios en primer plano, con vídeo. Ver §2.2 |
| `POST_NOTIFICATIONS` | Sí | Aviso «{app} está bloqueada» | Permiso en tiempo de ejecución en Android 13+. Sin formulario aparte |
| `RECEIVE_BOOT_COMPLETED` | Sí | El `BootReceiver` de la librería vuelve a arrancar el servicio al encender el teléfono | Sin formulario aparte. Sirve para que una sesión ya empezada siga bloqueando |
| `QUERY_ALL_PACKAGES` | Sí, hoy | Lo mete el manifiesto de la librería para `getInstalledApps()` | Formulario de permisos, si se deja. Ver §2.3: conviene quitarlo |
| Accesibilidad (`BIND_ACCESSIBILITY_SERVICE`) | **No** | — | **No presentes la declaración de accesibilidad.** No marques `isAccessibilityTool`. La pantalla de emergencia usa `accessibilityLabel`, `accessibilityHint` y `accessibilityActions` de React Native: son etiquetas para TalkBack y VoiceOver, no un `AccessibilityService`, y no piden ningún permiso |
| Administrador del dispositivo | **No** | — | Nada que declarar |
| `INTERNET` | Lo añade Expo/React Native al generar `android/` | El código de Apartag no abre conexiones | No declares recogida de datos de red |

La llave móvil firma cada QR con HMAC-SHA256 (`@noble/hashes@1.8.0`, MIT, sin red ni permisos). Caduca a los 60 s, vale una vez y tolera un desfase pequeño de reloj. El secreto ya emparejado se conserva.

La PR #4 (desbloqueos de emergencia y modo estricto) no añade permisos de Play. En `app.json` de Apartag (`com.apartag.app`) deja `android.allowBackup: false`. Las dependencias nuevas son `@expo-google-fonts/jetbrains-mono` (un `.ttf` local, licencia SIL OFL 1.1; no hay pantalla de avisos de terceros) y `expo-keep-awake@57.0.2`, que no trae config plugin ni permiso en su `package.json`: pide que la ventana no se apague. La cuenta atrás usa `AppState` y `activateKeepAwakeAsync` mientras corre, está lista o se confirma. El bloqueo automático de pantalla ya no la cancela. Bloquear a mano, cambiar de app o pasar a segundo plano (cualquier `AppState` distinto de `active`) sigue cancelando sin gastar un desbloqueo. Si `activateKeepAwakeAsync` falla, el error se ignora y el bloqueo automático podría cancelarla igual. No usa el acceso de uso ni el overlay.

### 2.1 Acceso de uso y overlay

El bloqueo en Android es acceso de uso más overlay. No es el servicio de accesibilidad. La política de Play pide usar la API más estrecha posible: aquí ya es esa (UsageStats + ventana de sistema), y por eso no se pide accesibilidad.

Texto de divulgación, para la ficha y para el paso de permisos de la app (español):

```
Apartag necesita dos permisos para bloquear de verdad.

Acceso de uso: para saber si la app que acabas de abrir es una de las que elegiste.
Solo se mira en el momento. No guardamos un historial de tu día y no sale de tu teléfono.

Mostrar sobre otras apps: para tapar esa app con un aviso hasta que acerques tu tag,
escanees la llave móvil o termines un desbloqueo de emergencia dentro de Apartag.
```

English, if the listing or a reviewer needs it:

```
Apartag needs two permissions to block for real.

Usage access: to see whether the app you just opened is one you chose.
That check happens in the moment. We do not keep a history of your day,
and it never leaves your phone.

Display over other apps: to cover that app with a notice until you tap
your tag, scan your mobile key, or finish an emergency unlock inside Apartag.
```

Hoy el onboarding abre las dos pantallas del sistema seguidas, sin este texto previo. Conviene enseñar este párrafo antes de cada permiso. Mientras tanto, pégalo en la descripción de Play y en las notas para el revisor.

### 2.2 Servicio en primer plano `specialUse`

Ruta: Contenido de la app → Permisos de servicios en primer plano.

La librería declara `android:foregroundServiceType="specialUse"` en `AppBlockerService`. No encaja en cámara, ubicación, sincronización ni reproducción: el servicio consulta `UsageStatsManager` unas veces por segundo y, si la app en primer plano está en la lista bloqueada, muestra el overlay y una notificación.

El plugin 0.1.77 no añade la propiedad `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` dentro del servicio. Android 14 la pide en el manifiesto. Hay que añadirla antes de la revisión, con un valor corto, por ejemplo:

```
Detects when a user-selected app comes to the foreground during a focus
session and covers it with a blocking overlay until the user scans an NFC tag
or mobile-key QR, or completes an in-app emergency unlock.
```

Respuestas del formulario:

| Campo | Qué escribir |
|---|---|
| Tipo | `specialUse` (SPECIAL_USE) |
| Caso de uso | No está en la lista cerrada. Escríbelo a mano: detectar la app bloqueada y taparla durante una sesión de foco que el usuario ha iniciado |
| Funcionalidad | El texto inglés del recuadro de abajo |
| Si el sistema aplaza la tarea | Las apps elegidas se abren con normalidad. La sesión de foco no se cumple |
| Si el sistema interrumpe la tarea | Una app bloqueada puede quedarse en pantalla hasta que el servicio vuelva. El usuario deja de ver el aviso |
| Vídeo | **[PENDIENTE: URL del vídeo]** |

Vídeo que hay que grabar, en el teléfono, sin cortes de la parte importante: conceder acceso de uso y mostrar sobre otras apps, marcar una app, acercar el tag (o la llave), abrir esa app, que aparezca el overlay «Estás en Apartag» y la notificación. Sin el vídeo, Play no cierra esta declaración.

Texto para el campo de descripción (inglés):

```
Apartag is a digital-wellbeing app. While a focus session the user started
is active, AppBlockerService (foreground service type specialUse) checks which
app is in the foreground with UsageStatsManager. If that app is one the user
chose to block, Apartag shows a full-screen overlay and a notification and
brings the user back to Apartag. The service stops when the user scans one of
their paired NFC tags or the mobile-key QR, or completes an emergency unlock
inside Apartag (limited to 3, each after a 5-minute countdown with the app in
the foreground; the exact refill date is not guaranteed). No usage data leaves
the device.
The service is not an AccessibilityService.
```

### 2.3 `QUERY_ALL_PACKAGES`

Sí se usa hoy. El manifiesto de `expo-app-blocker@0.1.77` incluye:

```xml
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

y, además, un `<queries>` de `MAIN` / `LAUNCHER`.

`getInstalledApps()` solo hace `queryIntentActivities` de las apps con actividad de lanzador. Pide el nombre, el paquete y el icono para pintar el selector. La selección se guarda en AsyncStorage. No se vende ni se manda a analítica.

La política publicada por Google (artículo 10158779) permite este permiso cuando el propósito principal es descubrir todas las apps del dispositivo, y cita búsqueda en el dispositivo, antivirus, gestores de archivos y navegadores. «Bloqueador» o «bienestar digital» no está en esa lista. El comentario dentro del manifiesto de la librería dice que un bloqueador es un caso aprobado: esa frase es del autor de la librería, no el texto de la política de Google.

Recomendación: quitar `QUERY_ALL_PACKAGES` con un config plugin antes de la primera subida, dejar el `<queries>` de lanzador, y no presentar este formulario. Es el método más estrecho y coincide con lo que el código consulta. Si en un teléfono con Android 11 o superior la lista sale incompleta, entonces sí presenta el formulario con el texto de abajo. La aprobación no está garantizada.

Si se mantiene el permiso, el formulario de declaración de permisos aparece al publicar el AAB. Texto (inglés):

```
Core functionality: the user picks which installed apps to block. That is the
product. getInstalledApps() lists launchable apps (package name and label) so
the user can make that choice. The list is shown on the device. Only the
packages the user selects are stored, in app-private storage. The inventory is
not transmitted, sold, or used for ads or analytics.

A <queries> element for MAIN/LAUNCHER is also present. QUERY_ALL_PACKAGES is
merged from expo-app-blocker 0.1.77 so the launcher list is complete on
Android 11 and later. If Play prefers the narrower queries declaration only,
we will remove QUERY_ALL_PACKAGES.
```

---

## 3. Apple · Etiqueta de privacidad (App Privacy)

Ruta: App Store Connect → la app → App Privacy.

| Pregunta | Respuesta |
|---|---|
| Do you or your third-party partners collect data from this app? | **No** |

Con eso, la ficha publica **Data Not Collected**. No marques identificadores, uso del producto, contactos ni diagnósticos.

Por qué es «no», y no «datos no vinculados a ti»:

- No hay cuenta ni servidor, así que el desarrollador no recibe datos.
- La selección de Tiempo de uso se comparte en el teléfono con las extensiones, en el App Group `group.com.apartag.app`. Los UID de los tags (principal y de repuesto), el secreto de la llave, las sesiones (con la marca «Emergencia» cuando procede), el contador de desbloqueos y el modo estricto van en AsyncStorage, también en el teléfono. No van al App Group.
- La cámara decodifica un QR y no guarda la imagen.
- Expo se usa para compilar. En el binario de tienda no hay `expo-updates` ni un socio que recoja datos. No declares a Expo como tercero que recoge datos.
- El pago de la tienda, cuando exista, lo procesa Apple. Esta versión no tiene compras, así que no hay datos de pago.

Matiz de los fallos: esta versión no integra un SDK de crashes. Si más adelante abres los informes de fallos de App Store Connect y los tratas como datos que recibes, la guía de Apple pide declarar Diagnósticos → Datos de fallos, no vinculados a la identidad, para el funcionamiento de la app, sin seguimiento. Hasta ese momento, la respuesta correcta es que no se recogen datos.

URL de la política de privacidad en la ficha: **[PENDIENTE: URL pública de la versión inglesa o española]**. El App Store en España puede enlazar la página en español; la ficha en inglés, la página en inglés.

---

## 4. Apple · Family Controls (Distribution)

Sin este entitlement de distribución no hay TestFlight ni App Store. El de desarrollo no vale para publicar. Lo tiene que pedir el Account Holder.

Dónde: [Requesting the Family Controls entitlement](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement) y la pestaña Capability Requests de Certificates, Identifiers & Profiles. Formulario: [Family Controls distribution](https://developer.apple.com/contact/request/family-controls-distribution).

Hay que enviarlo **cuatro veces**, una por identificador. Los tres de las extensiones no van incluidos en el de la app.

| Destino | Bundle ID |
|---|---|
| App | `com.apartag.app` |
| Extensión | `com.apartag.app.DeviceActivityMonitor` |
| Extensión | `com.apartag.app.ShieldAction` |
| Extensión | `com.apartag.app.ShieldConfiguration` |

App Group, el mismo en los cuatro: `group.com.apartag.app`.

Antes de pedirlos: **[PENDIENTE: Team ID de Apple]**. Hoy `app.json` no tiene `expo.ios.appleTeamId`. El README explica dónde ponerlo. Los cuatro App IDs tienen que existir en el portal con la capability Family Controls.

La librería llama a `AuthorizationCenter.shared.requestAuthorization(for: .individual)`. No pide autorización `.child`. No hay panel de padre ni control de otro dispositivo.

Justificación para pegar en el formulario (inglés):

```
Apartag (bundle ID com.apartag.app) is a self-control focus app for the
person who owns the device. They choose apps one by one. Categories are not
applied: iOS does not say whether Apartag is inside a category, and shielding
one could hide the emergency screen. The Screen Time picker cannot reliably
hide Apartag. If the user selects it and iOS does not identify the token, the
app cannot remove it. They then lock that choice with a physical NFC tag or
with a short-lived, single-use QR code shown on a trusted person's phone. To open the
shielded apps again, they scan one of their own keys (the tag, an optional
second tag, or the mobile key).

So that nobody gets stuck if they lose their key, the app also offers a
limited emergency unlock inside Apartag: 3 at most, one returning every 30
days on the device (the exact date is not guaranteed), each only after a
5-minute countdown with Apartag in the foreground. The screen stays awake
during that wait, so the automatic lock does not cancel it. Locking the
screen by hand or leaving the app cancels that countdown without using a
charge. It removes the shield the user set, from within the app. Using one
is recorded only in
the app's local stats, labeled "Emergencia" (the interface is in Spanish).
The user can turn on an optional strict mode (off by default) that disables
emergency unlocks; it requires at least two keys and typing ESTRICTO, and it
cannot be turned off while a lock is active.

We use Family Controls only with AuthorizationCenter for
FamilyControlsMember.individual. We do not request authorization for a
child. We do not manage another person's device. There is no parent or
guardian dashboard.

Screen Time APIs:
- FamilyControls: individual authorization, started by the device owner
  with Face ID or Touch ID.
- ManagedSettings: apply and remove shields for the selection the user made.
  Shields are removed when the user scans a key or completes an in-app
  emergency unlock.
- DeviceActivity: the DeviceActivityMonitor extension keeps the shield in
  place while a focus session is active.
- ShieldConfiguration and ShieldAction: show a shield the user can recognize
  (title "Estás en Apartag", subtitle telling them to go get their key) and
  return them to Apartag. The shield itself has no bypass button; the
  emergency unlock is only available inside the app.

The same distribution entitlement is required for these extensions, which
share the on-device App Group group.com.apartag.app:
- com.apartag.app.DeviceActivityMonitor
- com.apartag.app.ShieldAction
- com.apartag.app.ShieldConfiguration

Privacy: the Screen Time tokens, the user's selection, the session history,
and the emergency-unlock counter stay on the device. Apartag has no account,
no server, and no analytics. We do not receive the names of shielded apps on
a server. We do not sell or share Screen Time data.

This is not a parental-control product and not an MDM product.
```

Ese texto corresponde al binario ya rebasado: `com.apartag.app`, escudo «Estás en Apartag», permisos «Apartag usa NFC» y «Apartag usa la cámara», y el aviso del selector «No incluyas Apartag». `allowBackup: false` está en ese `app.json`.

Cuando Apple lo apruebe, el perfil de distribución tiene que incluir `com.apple.developer.family-controls` en la app y en cada extensión. Si falla la subida, lo habitual es que falte el entitlement de una de las tres extensiones, no el de la app.

---

## 5. Lo que estas respuestas no cubren

- Cuestionario de clasificación por edades (IARC / Apple). Hay que contestarlo en la consola. La app no está dirigida a menores de 14 años y no tiene contenidos de tienda que clasificar más allá de eso; no copies de aquí una edad de PEGI.
- Publicidad: no hay. En los formularios de anuncios, la respuesta es no.
- Compras: no hay en esta versión. Cuando exista el pago único, el producto será non-consumable y habrá que actualizar la ficha, no esta política de «no hay compras», el día que el código lo tenga.
- Orden de fusión: #4, #5 y después #6. Si se describen las emergencias en la ficha, usa 3 desbloqueos, 1 cada 30 días sin prometer la fecha, cuenta atrás de 5 minutos con la pantalla encendida (el bloqueo automático no la cancela; bloquear a mano o salir sí, y no gasta el cargo), etiqueta «Emergencia» y modo estricto opcional. Las categorías de Tiempo de uso no se aplican. Android pone `allowBackup` en false: la copia automática no copia ni restaura; una copia anterior puede seguir existiendo. En iPhone AsyncStorage 2.2.0 sigue fuera de iCloud. No hay códigos de respaldo ni recuperación remota. La respuesta de Data safety sigue siendo «no se recogen datos».

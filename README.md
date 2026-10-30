# Apartag

Aparta el móvil. Recupera tu tiempo.

App nativa de foco: eliges las apps, acercas un tag NFC, y esas apps se cierran. Para volver, hay que escanear el mismo tag o la llave móvil. Hay 3 desbloqueos de emergencia (se recupera 1 cada 30 días, máximo 3), cada uno con 5 minutos de espera. El modo estricto es opcional y las desactiva.

UI propia (noche + ámbar).

## Qué hace de verdad

- **Android (Windows o Mac):** bloqueo real con overlay + acceso de uso (`expo-app-blocker`) y lectura NFC del tag. `android.allowBackup` es `false`: Auto Backup no copia ni restaura el estado local (contador de emergencias, plazo y secreto de la llave móvil).
- **iOS (hace falta Mac):** bloqueo real con Tiempo de uso / Family Controls. Apple tiene que aprobar el entitlement para TestFlight y App Store. Mientras tanto, en Xcode usa *Family Controls (Development)*. No incluyas Apartag ni una categoría: las categorías no se aplican, porque iOS no dice si Apartag va dentro y el selector no deja ocultarla.
- **Expo Go no vale.** Hay que generar un development build.

## Generar APK (recomendado)

No hace falta Android Studio. Con cuenta de Expo:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Cuando termine, descarga el `.apk` desde el enlace que muestra la CLI e instálalo en el móvil (permite “origenes desconocidos” si te lo pide).

Perfil `preview` en `eas.json` → `android.buildType: "apk"`.

## Arrancar en Android (local)

1. Instala [Android Studio](https://developer.android.com/studio) y un emulador, o activa USB debugging en el móvil.
2. Un tag NFC (NTAG213/215/216). En emulador, **mantén pulsado** el tag de la pantalla de Foco para simular el toque.
3. En esta carpeta:

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

4. En Ajustes, abre **permisos Android** y concede:
   - Mostrar sobre otras apps
   - Acceso a uso
   - Notificaciones

## iOS

1. Pon tu Team ID de Apple en `app.json` → `expo.ios.appleTeamId`.
2. Crea el App Group `group.com.apartag.app` y estos 4 App IDs, con Family Controls:
   - `com.apartag.app` (app)
   - `com.apartag.app.DeviceActivityMonitor`
   - `com.apartag.app.ShieldAction`
   - `com.apartag.app.ShieldConfiguration`
3. `npx expo prebuild --platform ios` y `npx expo run:ios --device` (NFC y Screen Time no van en simulador).

## Uso

1. Onboarding: empareja el tag.
2. Apps: marca las que quieres cerrar. En Android, Apartag no sale en la lista. En iOS, elige apps una a una; una categoría no se bloquea.
3. Foco: acerca el tag (o mantén pulsado para simular).
4. Para desbloquear, el mismo tag o la llave móvil. Si los pierdes: Desbloqueo de emergencia, 3 veces, con la app abierta 5 minutos. Se recupera 1 cada 30 días (máximo 3) y no se paga. El modo estricto, en Ajustes, quita esa salida; solo se activa con una llave de repuesto (segundo tag o llave móvil) y escribiendo `ESTRICTO`.

La llave móvil es otro teléfono emparejado. Muestra un QR firmado con HMAC-SHA256 que caduca a los 60 segundos y solo vale una vez. Un desfase pequeño de reloj entre los dos móviles se tolera. Si la llave ya estaba emparejada, el secreto se conserva: no hay que volver a escanear el QR de emparejar, pero el móvil que hace de llave tiene que estar actualizado para firmar el QR nuevo.

---
## Mi rol y uso de IA

Apartag es un experimento de desarrollo dirigido por IA. El código lo escriben agentes de IA (Cursor) y yo no lo he escrito a mano.

Mi trabajo es todo lo demás:
- **Producto**: qué hace la app, el flujo de bloqueo con NFC, los desbloqueos de emergencia y la gamificación.
- **Especificaciones**: las tareas de cada PR y las reglas que siguen los agentes (`AGENTS.md`).
- **Revisión y merge**: reviso cada PR y decido si entra (27 merges de PR). De los 69 commits, 41 están firmados por "Cursor Agent"; los míos son sobre todo merges.
- **Pruebas**: pruebo cada cambio en mi propio dispositivo Android.

Quería comprobar hasta dónde se puede llegar dirigiendo agentes en una app nativa real, con NFC y módulos nativos.

## Decisiones técnicas

- **Development build de Expo en lugar de Expo Go** (decisión de producto: el bloqueo real necesita código nativo). En Android, módulos propios en Kotlin (`modules/nfc-tap`, `modules/usage-stats`); en iOS, extensiones de Screen Time (`targets/DeviceActivityMonitor`, `ShieldAction`, `ShieldConfiguration`).
- **TypeScript en modo estricto** (`tsconfig.json`, `"strict": true`) para que los estados del bloqueo y las emergencias no admitan valores imposibles.
- **Un único Context global** (`src/context/tiempo-store.tsx`, con `createContext` en la línea 162 y el valor memoizado con `useMemo` en la 1575): fue lo más rápido para iterar. Sé que ya es deuda (ver Próximos pasos).
- **Lógica pura separada de la UI** en `src/lib/` (gamificación, crecimiento del árbol, intentos bloqueados, llave móvil), con sus tests `*.test.ts`, para probarla sin dispositivo.
- **`android.allowBackup: false`**: Auto Backup no restaura el contador de emergencias ni el secreto de la llave móvil, así que no se puede saltar el límite reinstalando.
- **i18n desde el principio** (`src/i18n/`, `locales/`).

## Stack

Expo / React Native · TypeScript (strict) · Expo Router · Módulos nativos Kotlin (Android) y Swift (extensiones de Screen Time en iOS, sin probar en dispositivo) · NFC · EAS Build

## Próximos pasos (deuda conocida)

- Partir `src/context/tiempo-store.tsx` (1.673 líneas) en stores por área (NFC, bloqueo, gamificación, ajustes). Hoy cualquier cambio vuelve a renderizar toda la app.
- Dividir `src/lib/gamification.ts` (1.250 líneas) por responsabilidades.
- Unificar los tests (`scripts/test-*.mjs` y `src/lib/*.test.ts`) en un solo runner.

---

### English (short)

**My role & AI use.** Apartag is an AI-driven development experiment. The code is written by AI agents (Cursor), not by hand. I own the product, the specs (`AGENTS.md`), the review and merge of every PR, and I test every change on my own Android device. 41 of the 69 commits are authored by "Cursor Agent"; mine are mostly merges.
**Key decisions.** Expo dev build with native Kotlin/Swift modules for real blocking; strict TypeScript; pure logic in `src/lib` with tests; `allowBackup: false` to protect the emergency counter.
**Next steps.** Split the 1,673-line global store, split `gamification.ts`, unify the test runner.

---

## Licencia

© 2026 Juan Antonio López. Todos los derechos reservados.

El código de Apartag es propietario. El aviso MIT que había en `LICENSE` era el de la plantilla de Expo y ya no aplica a este repositorio. Las dependencias siguen con su propia licencia.

Política de privacidad, términos (español e inglés) y las respuestas para Google Play y el App Store: [`docs/README.md`](docs/README.md).

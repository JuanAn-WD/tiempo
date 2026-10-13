# Documentos legales de Apartag

Páginas para la landing y notas para rellenar las consolas de las tiendas. Describen la app con la PR #4 incluida (desbloqueos de emergencia locales y modo estricto opcional) y el nombre Apartag de esta rama. No hay compras ni servidor. Las emergencias no se envían a nadie.

## Publicar en la web

| Archivo | Idioma | Ruta sugerida |
|---|---|---|
| [docs/es/privacidad.md](es/privacidad.md) | Español | `/privacidad` |
| [docs/en/privacy.md](en/privacy.md) | English | `/en/privacy` |
| [docs/es/terminos.md](es/terminos.md) | Español | `/terminos` |
| [docs/en/terms.md](en/terms.md) | English | `/en/terms` |

El markdown está pensado para copiarse a una landing estática. Cada página enlaza a la otra lengua y al documento hermano.

## No publicar tal cual

[docs/tienda/declaraciones.md](tienda/declaraciones.md) son las respuestas para Google Play y App Store Connect, y el texto para pedir el entitlement Family Controls. Es material interno.

## Huecos que hay que rellenar antes de publicar o enviar a revisión

Busca `PENDIENTE` en `docs/`. Ninguno es opcional si la página o el formulario correspondiente se va a hacer público.

- Correo de contacto.
- Dirección postal del responsable.
- URL pública de privacidad y de términos. El 12 de octubre de 2026 los dominios apartag.com y apartag.app figuraban libres y no estaban comprados: no uses esas URL hasta que resuelvan.
- Nombre de la sociedad y NIF, si no publica como persona física Juan Antonio López.
- Enlace al vídeo del servicio en primer plano `specialUse` (lo pide Play).
- Team ID de Apple en `app.json` (`expo.ios.appleTeamId`), antes de pedir Family Controls.
- Decisión sobre `QUERY_ALL_PACKAGES`: quitarlo o presentar el formulario. El detalle está en las declaraciones.
- Decisión sobre el repositorio: hoy es público y GitHub lo marca como MIT por el archivo `LICENSE` de la rama por defecto. La licencia de este archivo, en esta rama, ya es propietaria. Conviene hacer el repositorio privado. El cambio de `LICENSE` no se refleja en la ficha de GitHub hasta que llegue a la rama por defecto.

## De dónde sale cada afirmación

- Persistencia: AsyncStorage usa la clave `tiempo.state.v3` y al guardar borra `tiempo.state.v2` y `v1`. No hay `fetch` ni SDK de analítica en `src/`. Android: `app.json` tiene `android.allowBackup: false` (`com.apartag.app`). Auto Backup no copia ni restaura los datos de esa build; una copia ya subida puede seguir existiendo. iPhone: `@react-native-async-storage/async-storage@2.2.0` excluye su carpeta de iCloud por defecto (`RCTAsyncStorageExcludeFromBackup` ausente → exclusión activa). El App Group de Tiempo de uso es otro almacén.
- Cámara: `src/app/scan-key.tsx` y `src/app/claim-key.tsx` leen un QR y no guardan foto. `app.json` desactiva el audio en Android (`recordAudioAndroid: false`).
- NFC: `src/lib/nfc.ts` lee el identificador del tag. No escribe el tag.
- Llave móvil: `src/lib/mobile-key.ts`. El QR de emparejar lleva el secreto en claro. El QR de pulso caduca a los 60 s (`PULSE_TTL_MS`) y dentro de ese minuto se puede reutilizar. La interfaz de emparejar dice «30 s»; los textos legales usan los 60 s del código.
- Bloqueo Android: `expo-app-blocker@0.1.77`. El plugin añade overlay (`SYSTEM_ALERT_WINDOW`), acceso de uso (`PACKAGE_USAGE_STATS`), servicio en primer plano `specialUse`, arranque y notificaciones. El manifiesto de la librería añade `QUERY_ALL_PACKAGES`. No hay `AccessibilityService`.
- iOS: `requestAuthorization(for: .individual)` en la librería. Extensiones `DeviceActivityMonitor`, `ShieldAction` y `ShieldConfiguration`, App Group `group.com.apartag.app`.
- Emergencias y modo estricto, en `origin/feat/3-emergencias` (`ff935fe`), ya rebasada sobre master con el nombre Apartag: `src/lib/emergency.ts` (`EMERGENCY_MAX = 3`, `EMERGENCY_REFILL_MS` = 30 días, `EMERGENCY_COUNTDOWN_MS` = 5 min, `STRICT_CONFIRMATION = 'ESTRICTO'`). Con el proceso vivo, `advanceEmergencyClock` solo fía de `performance.now()` (en React Native 0.86 no avanza mientras el teléfono duerme), así que la recarga puede tardar más de 30 días; en frío, con la app cerrada, cuenta el reloj de pared, y adelantarlo puede recargar antes. `src/app/emergency.tsx` llama a `activateKeepAwakeAsync` en las fases `running`, `ready` y `confirming`, así que el bloqueo automático no saca la app de `active`. Cualquier `AppState` distinto de `active` (salir, segundo plano o bloqueo a mano) cancela sin gastar el cargo. Si `activateKeepAwakeAsync` falla, el error se ignora. La etiqueta de estadísticas es «Emergencia». `DEFAULT_STATE.strict = false`; el `strict: true` heredado de `v2` se ignora. Activar el modo estricto exige dos llaves (`hasBackupKey`) y no se desactiva con `locked`. Android quita el propio paquete (`withoutOwnPackages`). En iOS, `guardIosSelection` descarta las categorías y, si el token se identifica, la propia app; el selector no puede ocultarla de forma fiable y un token opaco no se puede quitar.

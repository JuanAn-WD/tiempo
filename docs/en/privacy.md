---
title: Privacy policy
lang: en
updated: 2026-10-12
description: Apartag has no account, no server, and no analytics. What the app stores stays on your phone.
---

# Privacy policy

[Español](../es/privacidad.md) · [Terms of use](terms.md)

> Before you publish this page, replace every **[PENDING: …]**. Those blanks identify the controller. Without them, the page is not fit for the stores or for the people who use the app.

**Last updated: October 12, 2026**

Apartag has no account, no server, no ads, and no analytics. What the app stores stays on your phone. Juan Antonio López does not receive it and cannot see it.

## Who the controller is

The controller is **Juan Antonio López**, an individual, in Spain.

- Email: **[PENDING: contact email, for example hola@apartag.app]**
- Postal address: **[PENDING: full postal address]**
- This policy: **[PENDING: public URL, for example https://apartag.app/privacy]**

If the app is published in the name of a company, replace this section with that company's legal name, tax ID, and address.

## What Apartag is

Apartag locks the apps you choose. You tap an NFC tag, or you scan a QR code shown on a trusted person's phone, and those apps are blocked. Opening them again takes one of your keys: that tag, a second tag you paired as a spare, or the mobile key. If you lose them, and strict mode is off, you can use one of the emergency unlocks described below.

This version of the app is free and has no purchases.

## What does not happen to your data

- You do not create an account or sign in.
- We do not ask for your email, phone number, or name.
- There is no Apartag server that receives what you do.
- There are no ads and no advertising identifier.
- There is no product analytics and no third-party analytics.
- We do not sell or share data.
- We do not read your location, contacts, calendar, photos, files, or microphone.
- We do not use Android's accessibility service.

The stores (Google Play and the App Store) have their own download account. That relationship is between you and the store. Apartag does not receive your store identity.

## What is stored on the phone

Everything in this list stays in the app's private storage, on the phone itself. Uninstalling the app or clearing its data removes it from that installation. On Android, this version sets `allowBackup` to false: the system's automatic backup does not copy or restore the app's data. A backup uploaded before this version may still exist in the Google account. On iPhone, AsyncStorage (the counter, the tag identifiers, the key secret, and the sessions) is left out of the iCloud backup. The Screen Time selection lives separately, in the group shared with the extensions. Juan Antonio López does not receive a copy.

| What | Why |
|---|---|
| Whether you finished the introduction | So it is not shown again |
| Identifier of the paired NFC tag | To recognize your key and reject a different tag |
| Identifier of a second NFC tag (spare key), if you pair one | To accept it as a key too, and to know how many keys you have, because strict mode needs at least two |
| Mobile-key secret, if you create one | To check the QR code from the other phone |
| On the phone that acts as the key: that secret and a label | So it can show the QR code. The label inside today's pairing QR is the text "apartag.", not your name |
| Whether a session is running, and when it started | To keep the lock and time the session |
| Apps you select on Android (package name) | To know what to block |
| On iPhone: the Screen Time selection | To apply the system shield to what you chose |
| Chosen mode (Work, Study, Home, or Sport) | A label for the session. In this version all four modes share the same app list |
| Time from Apartag sessions, and up to 40 sessions (mode, start, end, and whether it ended with an emergency unlock) | The stats screen. Those sessions show the label «Emergencia». The interface is in Spanish |
| Emergency unlocks you have left, when the next one comes back, and the latest time the app has seen on the phone's clock | To keep count (one comes back every 30 days, up to 3, with no guaranteed date) and not to refill if the clock is behind that time |
| Whether strict mode is on | To hide and turn off emergency unlocks while it is on |
| Android block settings (list, overlay copy) | The service that covers a blocked app |

The age and hours in the "years on screen" calculator exist only while that screen is open. They are not saved. The calculation does not read your real phone use: it uses the numbers you type there.

## Permissions

Each permission is there to lock and unlock. If you refuse it, that part of the app cannot work. The operating system shows the permission and can revoke it.

**Android**

- **Camera.** Reads the mobile-key QR code. No photo is saved, and the microphone is not used.
- **NFC.** Reads the tag identifier. We do not write to the tag.
- **Display over other apps.** Covers a blocked app with a full-screen notice.
- **Usage access.** Sees which app is in the foreground, to tell whether it is one you blocked. It does not keep a history of your day and it does not send that information to anyone.
- **Notifications.** Tells you that an app is blocked.
- **Foreground service.** Keeps the lock for the length of the session, including after a reboot if the session was still on.
- **List of installed apps.** Lets you choose what to block. It is read on the phone. The only durable copy is the set of packages you select.

**iPhone**

- **Camera.** Same use as on Android: read a QR code, without saving the image.
- **NFC.** Same use: read the tag identifier.
- **Screen Time (Family Controls).** You authorize Apartag on your own iPhone, with Face ID or Touch ID. The app applies and removes the system shield for what you chose. Three system extensions (the activity monitor, the shield action, and the shield appearance) share a data group on that same iPhone so the shield can stay in place. The authorization is for you, on your phone. It is not parental control of someone else.

## Mobile key

If you create a mobile key, a secret is generated on your phone. The pairing QR code contains that secret. Whoever scans it stores it on their phone and can then lock and unlock your apps by showing another QR code.

That second QR code is signed on the phone with HMAC-SHA256 and expires after 60 seconds. It works only once: after it has been scanned, it will not work again, even if it is still on screen. A small clock difference between the two phones does not invalidate it. It does not pass through a server: it goes from one screen to the other phone's camera.

Show the pairing QR code only to someone you trust. You can revoke the key in Settings when a session is not locked. If strict mode is on, you can revoke it only if you still have two other keys (the tag and a second tag). Apartag cannot revoke it for you, because the secret never leaves the phones.

## If you lose the tag

If you paired a second tag or a mobile key, you can unlock with it.

If not, Apartag has **emergency unlocks**. They work only inside the app and only on your phone:

- You start with 3. They are free.
- One comes back every 30 days, up to a maximum of 3. Using one does not restart a waiting period that is already running. The days are calculated on the phone, and the date is not guaranteed. If the clock is behind the latest time the app already recorded, none comes back until the clock reaches that time. If the app stays in memory while the phone sleeps, that sleeping time may not count and the wait can run longer. If the app was closed and the clock was set forward, a refill can arrive sooner.
- Each one takes a 5-minute countdown with Apartag open on screen. The app keeps the screen awake during that wait and until you confirm or leave, so the phone's automatic lock does not cancel it. If you lock the screen yourself, switch apps, or Apartag goes to the background, the countdown is cancelled and nothing is used up. When it ends, you confirm and the lock opens.
- The session is recorded with the label «Emergencia» in the app's stats, on your phone. The interface is in Spanish. You can then pair a new tag.

Neither the counter nor those sessions leave the phone. Nobody, including Juan Antonio López, is told that you used an emergency unlock.

**Strict mode** is optional and off by default. If you turn it on, there are no emergency unlocks: only your keys unlock. To turn it on you need at least two keys (the tag plus a second tag or a mobile key) and you have to type "ESTRICTO". It cannot be turned off during a lock. While it stays on, you cannot remove a key if that would leave you with fewer than two.

This version has no backup codes. If you have no key and no emergency unlock left, or strict mode is on and you lost all your keys, the app cannot end the session from inside.

In that case, on Android you can uninstall Apartag, or turn off "display over other apps" and "usage access". The lock does not survive that. We do not ask for device-administrator rights.

On iPhone, the authorization is Screen Time for the owner of the phone. You can revoke Apartag's permission in Settings, within what iOS allows, or delete the app. We have no remote button that unlocks you.

On Android, the list of apps you can block does not include Apartag itself. On iPhone, the Screen Time picker cannot reliably hide Apartag. If you select it and the system does not identify that item, the app cannot remove it, and the shield can stop you from opening the emergency screen. Categories are not applied: iOS does not say whether Apartag is inside one, so you choose apps one by one.

Uninstalling or clearing data removes the counter from that installation, and a new installation starts again with 3, because there is no copy on a server. On Android, this version does not let automatic backup copy or restore that data; a backup from before this version may still exist. On iPhone, that store is left out of iCloud. Juan Antonio López receives none of those copies.

## Children

Apartag is not directed at children under 14. There is no sign-up, so we do not ask for an age and we do not hold children's data on a server. If the law of your country sets a higher age to consent to an app, that age applies.

## How long it lasts

The data lasts as long as the installation. To delete it, uninstall Apartag or clear the app's data in system settings. This version does not put it in Android's automatic backup. A backup made earlier may still sit in the Google account. On iPhone, AsyncStorage is not part of iCloud. No copy remains with the controller, because there never was one.

## Your rights

Because the controller does not receive this data, he cannot show you a copy he does not have, correct it, or delete it on a server. Access and deletion happen on your phone, as described above.

If you write to the contact email, you will get a reply about this policy. You can also lodge a complaint with the Spanish Data Protection Agency (aepd.es) if you believe the processing does not comply with the law.

## Processors, sharing, and transfers

Apartag does not use processors for the app's data, because that data is not sent from the phone to us.

Apple and Google handle the download and the store account under their own policies. If the operating system later offers to share crash diagnostics with the developer, that choice belongs to the store, it is off or voluntary according to the system, and it is not Apartag analytics. This version does not include a crash or metrics SDK.

Apartag makes no international transfers, because there is no Apartag server.

## Security

The data sits in the app's private space, with the protection of the system. Apartag does not add its own encryption layer on top. The mobile-key secret is stored there, which is why the pairing QR code should not appear in a screenshot or be shown to just anyone.

## Changes

If this policy changes, this page and the date above will be updated. When the app is in the stores, the listing will link to the public URL.

## Contact

Juan Antonio López  
**[PENDING: contact email, for example hola@apartag.app]**  
**[PENDING: full postal address]**

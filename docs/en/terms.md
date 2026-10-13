---
title: Terms of use
lang: en
updated: 2026-10-12
description: Terms of use for the Apartag app. A personal-use license, with no account and no server.
---

# Terms of use

[Español](../es/terminos.md) · [Privacy policy](privacy.md)

> Before you publish this page, replace every **[PENDING: …]**.

**Last updated: October 12, 2026**

These terms are the contract between you and **Juan Antonio López** for your use of the Apartag app. By installing or using it, you accept them. If you do not accept them, do not use the app.

- Email: **[PENDING: contact email, for example hola@apartag.app]**
- Postal address: **[PENDING: full postal address]**
- This page: **[PENDING: public URL, for example https://apartag.app/terms]**

If the app is published in the name of a company, that company becomes the party to these terms, and its legal name, tax ID, and address must be written here.

## The app

Apartag blocks the apps you choose. The key is an NFC tag, or another person's phone showing a QR code. You can add a second tag as a spare key. Getting back in takes one of your keys or, if strict mode is off, an emergency unlock.

This version:

- is free and has no in-app purchases;
- has no account and no server;
- includes up to 3 free, on-device emergency unlocks, each with a 5-minute wait, which the optional strict mode turns off;
- has no backup code;
- does not stop you from uninstalling the app.

It is physical friction, not a lock the author can open remotely, and it is not a medical device. It does not treat addiction and it is not a substitute for health care.

The four modes (Work, Study, Home, and Sport) are labels. In this version they share the same app list.

The years calculator uses the age and hours you type on that screen. It does not measure your real phone use.

## License

Apartag and its source code are owned by Juan Antonio López. All rights reserved. The details are in the `LICENSE` file in the repository.

You receive a personal, non-exclusive, non-transferable, revocable license to install and use the official binary on your phones, under these terms and the terms of the store you download it from.

That license does not allow you to copy the code, modify it, publish it, sell it, or create derivative works, except for non-waivable rights the law gives you (including, where it applies, decompilation for interoperability).

The Apartag name and wordmark belong to the owner. These terms do not claim that the trademark is registered.

Third-party components shipped in the app stay under their own licenses. That does not give you a license to the Apartag code.

## The key

Pair a tag you control. If you want, also pair a second tag as a spare key: it locks and unlocks just like the main one. Those tags' identifiers are stored only on your phone. The app does not write to the tags. Keys cannot be changed while a lock is on.

If you create a mobile key, the pairing QR code contains the secret that can lock and unlock. Anyone who scans it, or who gets a photo of that QR code, can act as the key until you revoke the secret in Settings (when a session is not locked and, if strict mode is on, only if you still have two other keys). Show it only to someone who understands what they are accepting.

The QR code that person shows afterward is signed on their phone, expires after 60 seconds, and can be used only once. A small clock difference between the two phones is tolerated.

Do not use Apartag to lock another person's phone unless they know and agree. The person who acts as the key has to want that role as well.

## Emergency unlocks and strict mode

If you lose your keys, the app offers emergency unlocks:

- You have up to 3. They are free and are not part of any purchase.
- One comes back every 30 days, up to a maximum of 3. Using one does not restart a waiting period that is already running. That date is not guaranteed. If the clock is behind the latest time the app already recorded, none comes back until the clock reaches that time. If the app stays in memory while the phone sleeps, sleeping time may not count and the wait can run longer. If the app was closed and the clock was set forward, a refill can arrive sooner.
- Each one takes a 5-minute countdown with Apartag open on screen. The app keeps the screen awake during that wait and until you confirm or leave, so the automatic lock does not cancel it. If the app goes to the background, you switch apps, or you lock the screen yourself, the countdown is cancelled and nothing is used up. When it ends, you have to confirm.
- The session is marked «Emergencia» in the stats, on your phone only. The interface is in Spanish.

The counter is stored and calculated only on your phone. The author cannot see, restore, or grant emergency unlocks. Uninstalling and installing again starts over at 3. On Android this version does not let automatic backup copy or restore that data; an older backup may still exist. On iPhone that store is not part of iCloud.

Strict mode is optional and off by default. While it is on, there are no emergency unlocks: only your keys unlock. To turn it on you need at least two keys (the main tag plus a second tag or a mobile key) and you have to type "ESTRICTO". It cannot be turned off during a lock, and while it is on you cannot remove a key if that would leave you with fewer than two. Turn it on only if you accept that, if you lose all your keys, the app will not be able to open the lock from inside.

On Android you cannot select Apartag itself in the list. On iPhone the Screen Time picker cannot reliably hide Apartag: if you select it and the system does not identify that item, the app cannot remove it, and you can be left unable to open the emergency screen. Categories are not blocked. You choose apps one by one.

## If you cannot unlock

If you have no key and no emergency unlock available, or strict mode is on and you do not have your keys, the author cannot unlock you: he does not have your secret, and there is no account of yours to sign in to. This version has no backup codes.

On Android, uninstalling the app, or turning off display-over-other-apps and usage access, ends the lock. On iPhone, you can revoke Apartag's Screen Time authorization in Settings, within what iOS allows, or delete the app.

## Permissions

Blocking needs the permissions described in the [privacy policy](privacy.md): on Android, camera, NFC, display over other apps, usage access, notifications, and a foreground service; on iPhone, camera, NFC, and Screen Time that you authorize. If you do not grant them, real blocking does not work.

Apartag does not request Android's accessibility service or device-administrator rights.

## Acceptable use

You agree to use the app lawfully. In particular, do not use it to monitor another person, to get around a safeguard for a child, or to interfere with a phone you do not manage with its owner's consent.

## Stores

If you download Apartag from Google Play or the App Store, you also accept that store's terms. Where those terms and these terms differ about payment or refunds, the store's terms win. In this version there is nothing to buy.

## Warranty and liability

The app is provided as is, without a promise that the lock cannot be bypassed, that it works on every phone, or that a particular tag will work. NFC and Screen Time depend on the system and the device. Emergency unlocks depend on the phone's clock and on the app staying open during the countdown. The screen stays awake so the automatic lock does not cut the wait short. A call, leaving the app, or locking the screen by hand does interrupt it, and then it has to be started again. There is no promise that each unlock returns in exactly 30 days.

None of this limits consumer rights that the law does not allow to be excluded. If you are a consumer in the European Union, you keep those rights.

Otherwise, to the extent the law allows, Juan Antonio López is not liable for indirect damages, for loss of data that existed only on your phone, or for your being unable to use apps you chose to block. Because this version has no price, there is no amount paid that can serve as a cap. This sentence does not apply where the law forbids that cap, or to harm the law does not allow to be limited.

## Changes

These terms may be updated by publishing the new version on this page, with a new date. If you keep using the app after that change, you accept the new version. If you do not accept it, stop using the app and uninstall it.

## Governing law

These terms are governed by Spanish law. If you are a consumer in the European Union, you may bring a claim in the courts of your home and the mandatory protections of your country apply. If you are not a consumer, the courts of the owner's domicile in Spain hear disputes, without prejudice to procedural rules that cannot be waived.

## Language

The Spanish version and the English version say the same thing. If they differ, the Spanish version prevails.

## Contact

Juan Antonio López  
**[PENDING: contact email, for example hola@apartag.app]**  
**[PENDING: full postal address]**

# TrackEm

TrackEm (display name `Track'Em`) is an offline-first personal finance tracker for Android. It uses Expo, React Native, and SQLite to keep balances, expenses, savings, bills, and money lent to others in one local app.

The project is Android-only. It does not provide cloud sync, multi-user collaboration, or legacy-data migration.

## Features

- **Dashboard:** funds overview, net position, spending and savings summaries, payables impact, and recent activity.
- **Expenses:** monthly expense history, category totals and filters, expense editing, and category management with archive, restore, reorder, and merge flows.
- **Accounts:** wallets and cards, savings and investment accounts, institution suggestions, local logos, balance editing, batch updates, and reconciliation.
- **Ledger:** account transaction history, pagination, filters, linked-entry navigation, and safeguards for entries owned by transfers or obligation payments.
- **Payables:** monthly bills, due dates, billers, categories, partial payments, remaining balances, payment history, duplication to another month, archive and restore, and payment editing or deletion.
- **Receivables:** money lent to another person, target payment dates, include-in-total controls, partial and full payments, payment history, archive and restore, and settled or overdue states.
- **Quick entry:** expense, income, transfer, lent-money, payable, payable-payment, receivable, and receivable-payment flows. Transfer fees are recorded as a separate expense impact.
- **Entry tools:** a built-in amount calculator and Android-friendly expense or income direction controls.
- **Settings and safety:** appearance controls, dark mode, font and accent choices, backup export and restore, demo mode, local reset, startup recovery, and optional OTA update prompts.
- **Offline branding:** institution metadata and bundled logos are resolved locally, with brand-color initials as the fallback.

## Prerequisites

- Node.js and npm. Exact Node.js, Java, and Android SDK versions are not pinned in this repository; use a current Node.js LTS release compatible with Expo SDK 57.
- Android Studio with an Android SDK and either an emulator or a USB-connected Android device for local native runs.
- EAS CLI `>=16.28.0` plus an authenticated Expo account for hosted APK builds and OTA publishing. The required EAS version is declared in `eas.json`.

Personal financial data does not require a backend or runtime service account. The app stores data in local SQLite databases. The optional institution-logo download workflow uses `BRANDFETCH_CLIENT_ID`; it is not needed to run the app because bundled logos are already included.

## Quick start

Install dependencies and start the Expo development server:

```bash
npm install
npm run start
```

In another terminal, build and install the local Android development binary:

```bash
npm run android
```

The local Android project is generated in the ignored `android/` directory. This repository does not define a `prepare:binaries` script. Use `npm run android` for local native setup, or the EAS commands below for distributable APKs.

## Android binaries and OTA updates

Use a preview APK for device testing and a production APK for release distribution:

```bash
npm run build:preview
npm run build:prod
```

JavaScript and asset changes that do not change the native runtime fingerprint can ship through an OTA update:

```bash
npm run ota:preview -- --message "Describe the preview update"
npm run ota:prod -- --message "Describe the production update"
```

Use the preview channel first. When native modules or native build configuration change, update both `expo.version` and `expo.extra.displayVersion` in `app.json`, then build a new APK. For JS-only changes, update the display version and use the OTA flow. EAS manages Android build-code auto-incrementing; the runtime compatibility policy is `fingerprint`.

## Local data and boundaries

- Runtime data is stored in `finance_tracker_v2.db`; demo mode uses `finance_tracker_v2_demo.db`.
- Money is stored as integer cents in the persistence layer and exposed as decimal pesos to the UI and feature services.
- Backup payloads use version `3.0` and are validated before restore.
- There is no iOS target, cloud sync, multi-user mode, or legacy migration path.
- The app does not hotlink institution images at runtime. Unknown institutions use local initials and brand colors.

## Commands

| Area         | Command                                  | Purpose                                                                    |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------- |
| Setup        | `npm install`                            | Install the locked dependency tree.                                        |
| Development  | `npm run start`                          | Start the Expo development server.                                         |
| Development  | `npm run start:clear`                    | Start Expo after clearing the Metro cache.                                 |
| Development  | `npm run android`                        | Generate or use the local Android project and install a development build. |
| Testing      | `npm test`                               | Run the Jest test suite.                                                   |
| Testing      | `npm run test:watch`                     | Run Jest in watch mode.                                                    |
| Testing      | `npm run test:ci`                        | Run Jest serially for CI-style output.                                     |
| Quality      | `npm run typecheck`                      | Run TypeScript without emitting files.                                     |
| Quality      | `npm run lint`                           | Run ESLint with zero warnings allowed.                                     |
| Quality      | `npm run format`                         | Format source and public release-note files with Prettier.                 |
| Quality      | `npm run format:check`                   | Check source and public release-note formatting.                           |
| Quality      | `npm run verify`                         | Run formatting, lint, typecheck, and the serial test suite.                |
| Audit        | `npm run audit:ui-layering`              | Check the runtime UI layering rules.                                       |
| Audit        | `npm run audit:tokens`                   | Check for disallowed raw color literals.                                   |
| Audit        | `npm run audit:frontend`                 | Run the token audit, lint, and typecheck together.                         |
| Logos        | `npm run logos:sync`                     | Normalize logo assets and regenerate the local catalog and manifest.       |
| Logos        | `npm run logos:check`                    | Check logo conversions and generated outputs without writing.              |
| Logos        | `npm run logos:download`                 | Download institution logo candidates using `BRANDFETCH_CLIENT_ID`.         |
| Logos        | `npm run verify:logos`                   | Run the logo consistency and asset checks.                                 |
| Distribution | `npm run build:preview`                  | Build an internal preview APK through EAS.                                 |
| Distribution | `npm run build:prod`                     | Build a production Android binary through EAS.                             |
| Distribution | `npm run ota:preview -- --message "..."` | Publish an OTA update to the preview channel.                              |
| Distribution | `npm run ota:prod -- --message "..."`    | Publish an OTA update to the production channel.                           |

Run `npm run verify` before a release. When institution metadata or bundled logos change, also run `npm run verify:logos`. Automated checks should be followed by an Android device pass covering startup, navigation, entry flows, obligations, backup and restore, demo mode, and account branding.

## Quality checks and repository boundaries

Run `npm ci` followed by `npm run verify` for the repeatable local quality gate. It does not require Expo or EAS credentials, an Android SDK, a device, or network-backed institution-logo downloads. Release owners should also complete the Android device smoke pass and any EAS publishing checks described above.

The public tree intentionally keeps internal operating material out of version control. `AGENTS.md`, `docs/`, and `CHANGELOG.md` are local-only guidance and project records; the README, release notes, source, and scripts are the public setup and maintenance references.

## Project layout

- `App.tsx`: application entry point.
- `src/app/`: bootstrap and root composition.
- `src/features/app/`: runtime screens, hooks, and feature composition.
- `src/features/*/service.ts`: domain operations and decimal-to-cents boundaries.
- `src/data/`: SQLite database, repositories, persistence services, seed data, and backup logic.
- `src/navigation/` and `src/shell/`: navigation, safe areas, banners, overlays, and tab gestures.
- `assets/app-icon/`, `assets/icons/`, and `assets/institutions/`: canonical bundled assets.

# Spendly

Spendly is a React Native expense-tracking app. Email/password registration and login use Firebase Authentication. The profile document is stored in Firestore at `users/{uid}` and is read for the signed-in home screen. Passwords are handled only by Firebase Authentication; they are never written to Firestore.

Authenticated income and expense transactions are saved in Cloud Firestore at `users/{uid}/transactions/{transactionId}` and update live on the dashboard. Budgets and currency preferences remain in-memory UI data and are cleared when the app closes or the user signs out. A local demo remains available from the sign-in and registration screens; demo entries are never uploaded.

## Firebase setup

1. In Firebase Console, confirm the Android app package is `com.appname` and download its `google-services.json`. The supplied file is placed at `android/app/google-services.json` for the Android Gradle plugin.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Create a Cloud Firestore database.
4. Deploy the included owner-only profile rules from the project root using Firebase CLI:

   ```sh
   firebase deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
   ```

   Get the project ID from Firebase Console or the supplied Google services configuration. Do not put a service-account key in the app.

5. Rebuild the Android app after native dependency changes:

   ```sh
   npm install
   npm run android
   ```

## Spendly AI (Groq + Qwen)

AI requests run through the authenticated `aiAssistant` Firebase callable
function. The function reads up to the caller's 1,000 newest records from
`users/{uid}/transactions`, calculates a compact summary and possible
duplicate/unusual-expense flags, and sends summary totals/categories and
flagged amount/date/category values—not raw transaction descriptions,
credentials, or user IDs—to Groq. AI results are suggestions, not financial
advice. The function limits each Firebase UID to 40 requests per UTC day.

1. Use a replacement Groq API key. The key previously shared in chat should be
   revoked; never put provider keys in React Native source, `.env` files bundled
   with the app, or Firestore.
2. Enable Firebase Cloud Functions and upgrade the Firebase project to the
   Blaze plan. The deployed runtime uses Node.js 22.
3. From the project root, set the provider key through Firebase's secret
   manager. The CLI prompts for the value so it does not need to appear in
   shell history:

   ```sh
   firebase functions:secrets:set GROQ_API_KEY --project YOUR_FIREBASE_PROJECT_ID
   ```

4. Install and deploy the function and updated Firestore rules:

   ```sh
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions,firestore:rules --project YOUR_FIREBASE_PROJECT_ID
   ```

   Firebase deployment also builds the TypeScript function. The callable uses
   the Qwen model ID `qwen/qwen3.8-27b` and Groq's OpenAI-compatible endpoint.
   If Groq does not offer that exact model ID for your account, update `MODEL`
   in `functions/src/index.ts` to a model currently enabled for your Groq
   project and redeploy.
5. Install the updated app dependencies and rebuild the native Android app:

   ```sh
   npm install
   npm run android
   ```

   For iOS, install the updated CocoaPods dependencies and use the Firebase iOS
   configuration already required by Authentication.

The AI screen offers a money coach chat, spending insights, budget and savings
suggestions, a monthly forecast, possible duplicate/unusual-expense alerts, and
a monthly report. Chat context is held only in app memory. Local demo data
cannot call the AI function.

Registration writes `fullName`, normalized `email`, Firebase `uid`, `termsAccepted`, and server timestamps to the signed-in user’s `users/{uid}` profile document. Authenticated income and expense records contain amount, category, description, type, date, and server timestamps in that user's `transactions` subcollection. Firestore rules restrict transaction access and mutation to the owning UID and validate the stored fields. Existing Firebase accounts without a profile show a setup error instead of a misleading empty account.

For iOS, download the matching `GoogleService-Info.plist` from Firebase Console and add it to the iOS app target in Xcode. That platform-specific configuration was not included with the supplied Android JSON; Firebase sign-in on iOS is not ready until it is added.

## Run the app

This project uses [React Native](https://reactnative.dev) and [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

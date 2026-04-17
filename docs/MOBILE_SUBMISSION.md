# Mobile App Store Submission Guide

**Application:** Kreno (Staff Management Mobile App)  
**Version:** 1.0.0  
**Build Number:** 1  
**API Endpoint:** https://kreno.ch  
**Last Updated:** 2026-04-17

---

## Overview

This document provides comprehensive guidance for submitting the Kreno mobile application to both Google Play Store (Android) and Apple App Store (iOS).

---

## Application Details

| Property | Value |
|----------|-------|
| **App Name** | Kreno |
| **App Tagline** | Gestion professionnelle de votre salon |
| **Package Name (Android)** | ch.kreno.app |
| **Bundle ID (iOS)** | ch.kreno.app |
| **Version Number** | 1.0.0 |
| **Build Number** | 1 |
| **Language** | French (fr_FR) |
| **API Endpoint** | https://kreno.ch |
| **Privacy Policy URL** | https://kreno.ch/privacy |
| **Terms of Service URL** | https://kreno.ch/terms |

---

## Android Submission (Google Play Store)

### Checklist

- [ ] **Build Artifact**
  - [ ] APK built successfully: `build/app/outputs/flutter-apk/app-release.apk` (55MB)
  - [ ] APK signed with release keystore
  - [ ] File verified and tested on multiple Android devices/emulators

- [ ] **App Signing Configuration**
  - [ ] Google Play App Signing enabled (let Google manage signing)
  - [ ] Upload key configured in `android/app/build.gradle`
  - [ ] Keystore password secured (never commit to git)

- [ ] **App Configuration**
  - [ ] Minimum SDK: API 21 (Android 5.0)
  - [ ] Target SDK: API 34+ (Latest stable)
  - [ ] Compiled SDK: API 34+
  - [ ] Application runs without crashes on min/target SDK versions

- [ ] **Permissions**
  - [ ] Camera access (required for image selection in staff profiles)
  - [ ] Photo library access (image picker functionality)
  - [ ] Network access (API communication to https://kreno.ch)
  - [ ] All permissions justified in app description

- [ ] **Content Rating Questionnaire**
  - [ ] Complete Google Play content rating questionnaire
  - [ ] Category: Productivity/Business
  - [ ] Content Rating: Everyone (no restricted content)

- [ ] **App Description**
  - [ ] Title: "Kreno - Gestion de Salon"
  - [ ] Short Description: "Application professionnelle pour gérer votre salon et vos rendez-vous"
  - [ ] Full Description: Include features (staff scheduling, client management, real-time updates)
  - [ ] Language: French

- [ ] **Store Listing Assets**
  - [ ] App Icon: 512x512 PNG (adaptive icon with foreground + background)
  - [ ] Feature Graphic: 1024x500 PNG
  - [ ] Screenshots (minimum 2, recommended 5):
    - Dashboard/home screen
    - Booking management
    - Client list
    - Staff profiles
    - Settings/branding
  - [ ] Promo graphic (optional): 180x120 PNG
  - [ ] Video preview (optional): Short demo of key features

- [ ] **Privacy & Security**
  - [ ] Privacy policy URL provided and accessible
  - [ ] Explain all data collection (authentication, salon data, user preferences)
  - [ ] Confirm compliance with GDPR/privacy laws
  - [ ] No tracking libraries without explicit consent

- [ ] **Testing Instructions**
  - [ ] Provide test account credentials (email: test@kreno.ch, password: test123)
  - [ ] Document key user flows for reviewer testing
  - [ ] Specify minimum testing device recommendations

- [ ] **Release Notes**
  - [ ] Version 1.0.0 release notes
  - [ ] Highlight: Staff scheduling, real-time bookings, client management, customizable branding

### Google Play Submission Steps

1. **Create/Access Developer Account**
   - Visit https://play.google.com/console/
   - Complete merchant/payment setup if new

2. **Create New App**
   - App name: "Kreno"
   - Default language: French (Français)
   - App category: Productivity/Business

3. **Upload APK**
   - Go to Release > Production
   - Attach: `barber_app/build/app/outputs/flutter-apk/app-release.apk`
   - Review crash reports pre-release

4. **Complete Store Listing**
   - Fill all required fields (description, screenshots, privacy policy)
   - Enable content rating questionnaire

5. **Configure App Release**
   - Set version code: 1
   - Set version name: 1.0.0
   - Countries: Start with top 10 markets (France, Canada, Belgium, etc.)

6. **Submit for Review**
   - Review all requirements checklist
   - Submit to Play Store review team
   - Expected review time: 2-24 hours

---

## iOS Submission (Apple App Store)

### Prerequisites

- [ ] Apple Developer Account (annual fee: ~$99 USD)
- [ ] Mac with latest Xcode installed
- [ ] Apple Developer Certificates & Provisioning Profiles created
- [ ] App ID created in Apple Developer Portal

### Checklist

- [ ] **Build Artifact**
  - [ ] IPA built successfully from Xcode
  - [ ] Build tested on iOS 14.0+ (minimum deployment target)
  - [ ] No deprecated APIs used

- [ ] **Code Signing**
  - [ ] Distribution certificate configured
  - [ ] App Store provisioning profile created
  - [ ] Signing team ID correct in build settings

- [ ] **App Configuration**
  - [ ] Minimum iOS version: 14.0 (or higher based on Flutter support)
  - [ ] Supported devices: iPhone, iPad
  - [ ] Supported orientations: Portrait & Landscape
  - [ ] iPad split-screen support enabled

- [ ] **Permissions (Info.plist)**
  - [ ] Camera usage: `NSCameraUsageDescription`
  - [ ] Photo library: `NSPhotoLibraryUsageDescription`
  - [ ] All other required permissions declared

- [ ] **App Store Connect Configuration**
  - [ ] App Name: "Kreno"
  - [ ] Subtitle: "Gestion de Salon"
  - [ ] Bundle ID: ch.kreno.app
  - [ ] Version: 1.0.0

- [ ] **App Description & Keywords**
  - [ ] Primary category: Business/Productivity
  - [ ] Keywords: salon, scheduling, booking, staff, management
  - [ ] Full description in French and English (if targeting both markets)

- [ ] **App Store Assets**
  - [ ] App Icon: 1024x1024 PNG (no alpha channel, no rounded corners)
  - [ ] Screenshots (minimum 2 per device type):
    - iPhone 6.7" and 5.5" screenshots
    - iPad 12.9" screenshots (if supported)
  - [ ] App Preview (video): Optional but recommended (15-30 seconds)
  - [ ] Promotional text: Brief update highlights

- [ ] **Privacy & Security**
  - [ ] Privacy policy URL provided
  - [ ] Complete App Privacy section:
    - Data collection types (user authentication, salon data)
    - Tracking data (if any)
    - Data sharing with third parties
  - [ ] GDPR compliance documentation

- [ ] **Age Rating**
  - [ ] Complete age rating questionnaire
  - [ ] Select: 4+ (no restricted content)

- [ ] **Pricing & Availability**
  - [ ] Price tier: Free
  - [ ] Availability: All countries (or select regions)
  - [ ] Business model: Free app with cloud API dependency

- [ ] **Testing**
  - [ ] Provide test account credentials
  - [ ] Ensure reviewer can complete full user flow
  - [ ] Test on multiple iOS versions (especially minimum and latest)

### iOS Submission Steps

1. **Create/Access Apple Developer Account**
   - Visit https://developer.apple.com/
   - Complete KYC verification if new

2. **Create App ID in Developer Portal**
   - App ID Prefix: Team ID (auto-generated)
   - Bundle ID: ch.kreno.app
   - Capabilities: Push Notifications (optional)

3. **Create Distribution Certificates**
   - iOS Distribution (production)
   - Request from Mac Keychain
   - Download and install

4. **Create App Store Provisioning Profile**
   - App ID: ch.kreno.app
   - Certificate: Distribution certificate
   - Download and install

5. **Configure Xcode Build Settings**
   - Team ID
   - Signing certificate
   - Provisioning profile
   - Build number incrementing

6. **Create App in App Store Connect**
   - Visit https://appstoreconnect.apple.com/
   - Create new iOS app
   - Bundle ID: ch.kreno.app
   - Language: French (primary)

7. **Prepare for Submission**
   - Archive app from Xcode
   - Export IPA with distribution provisioning profile
   - Validate app in Xcode
   - Upload to App Store Connect

8. **Submit for Review**
   - Complete all required app store information
   - Submit to App Review
   - Expected review time: 1-3 days

---

## Asset Specifications

### App Icons

**Android:**
- Adaptive Icon Foreground: 108x108 PNG
- Adaptive Icon Background: 108x108 PNG or color
- Legacy Icon: 192x192 PNG, 512x512 PNG

**iOS:**
- App Icon Set: 1024x1024 PNG
- Sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180 pixels
- Format: PNG with no alpha channel, no rounded corners

### Screenshots

**Recommended:**
- 5-8 screenshots per app store
- Show key user flows (login, scheduling, client management)
- Overlay text explaining each feature (optional but effective)
- Consistent branding and color palette (Kreno brand colors)

### Feature Graphic (Android Only)

- 1024x500 PNG
- Show app name and key feature
- Use Kreno brand colors

---

## Privacy & Compliance

### Privacy Policy Requirements

The privacy policy at https://kreno.ch/privacy must address:

1. **Data Collection**
   - User authentication data (email, hashed password)
   - Salon configuration and branding settings
   - Staff member information (shared within organization)
   - Client data (if salon tracks customers)
   - App usage analytics (if enabled)

2. **Data Usage**
   - Backend API communication at https://kreno.ch
   - Local device storage (SharedPreferences for tokens)
   - No third-party tracking without consent

3. **GDPR Compliance** (if targeting EU users)
   - Legal basis for data processing
   - User rights (access, deletion, portability)
   - Data retention policies
   - Data processor information

4. **Third-Party Services**
   - List any external APIs or services
   - Include links to their privacy policies

### API & Network Requirements

- **API Endpoint:** https://kreno.ch
- **SSL/TLS:** Enforced (no cleartext HTTP)
- **Authentication:** JWT tokens, Authorization header
- **Data Encryption:** HTTPS for all API calls
- **No hardcoded credentials** in app code

---

## Testing Checklist

### Functional Testing

- [ ] User authentication works (login/logout)
- [ ] Dashboard displays correctly
- [ ] Bookings can be viewed and managed
- [ ] Salon settings accessible and editable
- [ ] Branding colors persist across app restart
- [ ] Real-time updates sync with backend
- [ ] Image picker works (camera & library)
- [ ] All text in French displays correctly
- [ ] No console errors or warnings

### Device Testing

- [ ] Tested on minimum SDK device (Android API 21)
- [ ] Tested on latest SDK device (Android API 34+)
- [ ] Tested on minimum iOS version (iOS 14.0)
- [ ] Tested on latest iOS version
- [ ] Landscape orientation works
- [ ] Tablet/iPad view works (if supporting)

### Performance Testing

- [ ] App launches in < 5 seconds
- [ ] No ANRs (Application Not Responding) on Android
- [ ] Memory usage stable over extended use
- [ ] Battery consumption reasonable
- [ ] Network requests timeout appropriately

### Security Testing

- [ ] JWT token stored securely (no plaintext)
- [ ] API calls use HTTPS only
- [ ] No credentials hardcoded in code
- [ ] No sensitive data logged
- [ ] Image uploads to CDN work securely

---

## Post-Submission

### Monitoring

After submission, monitor:

1. **Store Console**
   - Android: Google Play Console crash reports
   - iOS: App Store Connect crash logs
   - User ratings and reviews

2. **Analytics**
   - Daily active users
   - Crash rates
   - Session duration
   - Common user flows

3. **Support Channel**
   - Set up email support (support@kreno.ch)
   - Monitor for crash reports
   - Prepare quick-fix updates if needed

### Future Updates

- Keep version number synced with backend API
- Test new features thoroughly before submission
- Plan around app review timelines (1-3 days typical)
- Maintain backward compatibility with older API versions

---

## Release Schedule

| Phase | Timeline | Action |
|-------|----------|--------|
| **Build Complete** | 2026-04-17 | APK ready (55MB) |
| **Google Play Submission** | 2026-04-17 | Submit to review |
| **Google Play Review** | 2026-04-18 to 2026-04-19 | Expected review completion |
| **iOS Submission** | 2026-04-20 | Submit IPA (requires Mac/Xcode) |
| **iOS Review** | 2026-04-21 to 2026-04-23 | Expected review completion |
| **Launch** | 2026-04-24 | Both stores live (estimated) |

---

## Contact & Support

- **App Support:** support@kreno.ch
- **Developer:** Kreno Team
- **Website:** https://kreno.ch
- **Privacy:** https://kreno.ch/privacy
- **Terms:** https://kreno.ch/terms

---

## Appendix: Build Commands

### Android

```bash
cd barber_app
flutter clean
flutter pub get
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### iOS

```bash
cd barber_app
flutter clean
flutter pub get
flutter build ios --release
# Then export IPA from Xcode
```

### Configuration Files

- **pubspec.yaml:** Version 1.0.0, Flutter SDK ^3.11.0
- **android/app/build.gradle.kts:** Minimum SDK 21, Target SDK 34+
- **ios/Runner.xcodeproj:** Bundle ID ch.kreno.app, Deployment Target iOS 14.0

---

**Document Status:** READY FOR SUBMISSION  
**Reviewed:** 2026-04-17  
**Next Update:** After first app review feedback

# NetPará - Social Media Android App

A modern social media application for Android built with Kotlin, Jetpack Compose, and Google Web Services.

---

## 📱 GitHub Actions দিয়ে APK তৈরি ও টেস্ট করার নিয়ম (Bengali Guide)

এই প্রোজেক্টে GitHub Actions Workflow কনফিগার করা আছে। আপনি GitHub-এ কোড পুশ করলেই স্বয়ংক্রিয়ভাবে ইনস্টলেবল APK তৈরি হয়ে যাবে।

### ১. GitHub-এ কোড পুশ করুন
প্রোজেক্টটি আপনার GitHub রিপোজিটরিতে `main` বা `master` ব্রাঞ্চে পুশ করুন:
```bash
git add .
git commit -m "Configure GitHub Actions APK build"
git push origin main
```

### ২. GitHub Actions রান দেখা
1. আপনার GitHub রিপোজিটরি ওপেন করুন।
2. উপরে **"Actions"** ট্যাবে ক্লিক করুন।
3. **"Build & Export Android APK"** নামের ওয়ার্কফ্লোটি স্বয়ংক্রিয়ভাবে চলা শুরু করবে।
4. চাইলে ম্যানুয়ালিও চালাতে পারেন:
   - বাম পাশে **"Build & Export Android APK"** সিলেক্ট করুন।
   - ডান পাশে **"Run workflow"** বাটনে ক্লিক করুন।
   - Build type (`debug`) নির্বাচন করে **"Run workflow"** চাপুন।

### ৩. APK ডাউনলোড করুন
1. ওয়ার্কফ্লোটি সম্পন্ন হলে (সবুজ টিক চিহ্ন দেখা যাবে) সেটির ওপর ক্লিক করুন।
2. পেজের নিচে স্ক্রল করে **"Artifacts"** সেকশনে যান।
3. **`NetPara-Android-APK`** নামের ফাইলে ক্লিক করলে জিপ (ZIP) আকারে ডাউনলোড হবে।

### ৪. মোবাইলে ইনস্টল ও টেস্ট করুন
1. ডাউনলোড করা ZIP ফাইলটি আনজিপ করুন।
2. এর ভেতরের **`NetPara-debug-v1.0.apk`** ফাইলটি আপনার অ্যান্ড্রয়েড ফোনে নিন।
3. ফাইলে ট্যাপ করে ইনস্টল করুন (যদি ফোনে পারমিশন চায়, তবে **"Install unknown apps"** বা **"Allow from this source"** অন করে দিন)।
4. অ্যাপটি ওপেন করে টেস্ট করুন!

---

## 🛠 Local Build Command
If you want to build the APK locally on your computer:
```bash
./gradlew assembleDebug
```
Output APK location:
`app/build/outputs/apk/debug/app-debug.apk`

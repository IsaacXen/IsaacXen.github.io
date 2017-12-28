---
title: Adding Login Items in Cocoa
summary: Here is a simple guide on how to add login item using Service Management Framework.
---

There’s a lot of guides and simple code out there showing you how to add your login item. But sadly most of them are (or will be) deprecated, so here is how to make our app launch on login, version 2017.

## The ~~most recommended~~ only way: Service Management Framework

This is probably the ~~most recommended~~ only approach ~~if we need to keep our app sandboxed~~ left, as suggested in [Daemons and Services Programming Guide](https://developer.apple.com/library/content/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLoginItems.html).

Here is how it works:

1. Register helper as login item
2. When login, system launch the helper
3. Helper launch our main application
4. Main application kill helper

### Add and configure helper application

Say we have a working project already, go to project settings (the blueprint icon under project navigator), add a Cocoa App to the targets.

Now we need to do some configurations.

For helper application target:

- in **Info** tab, under **Custom macOS Application Target Properties** section, set either `Application is background only` or `Application is agent (UIElement)` to `true`, add a new one if you don't see it.
- In **Build Settings** tab, under **Deployment** section, set `Skip Install` to `YES` .

For main application target:

- In **Build Phases** tab, click the plus button on the top left corner and select **New Copy File Phase** (skip this if you already have one). Set **Destination** to `Wrapper`, **Subpath** to `Contents/Library/LoginItems` and add you helper app to the list.
- In **General** tab, add the helper app to **Embedded Binaries**.

### Time for some code!

It's super simple to register our helper, all we need to do is to call [`SMLoginItemSetEnabled`](https://developer.apple.com/documentation/servicemanagement/1501557-smloginitemsetenabled) .

```swift
import ServiceManagement

let launchHelperIdentifier = "com.your.launchHelperIdentifier" as CFString // your helper app's bundle identifier
let enabled = true // should your app launch at startup

SMLoginItemSetEnabled(launchHelperIdentifier, enabled)
```

Note that this is effective only for the currently logged in user. Also, there's another thing you need to pay attention to:

> If multiple applications (for example, several applications from the same company) contain a helper application with the same bundle identifier, only the one with the greatest bundle version number is launched. Any of the applications that contain a copy of the helper application can enable and disable it.

### Reading the settings

But how do we know whether our app is enabled or not?

There's another function called `SMCopyAllJobDictionaries` which returns an array of the job description dictionaries for all jobs in the given domain. And there's two domain that are related to what we need: `kSMDomainUserLaunchd` and `kSMDomainSystemLaunchd`. We can tell by their name that the former one return login items for current user and later one return items system-wide. That means `kSMDomainUserLaunchd` is what we want.

```swift
let jobs = SMCopyAllJobDictionaries(kSMDomainUserLaunchd).takeRetainedValue() as? [[String: AnyObject]]
```
`SMCopyAllJobDictionaries` return a `Unmanaged<CFArray>!` and we need to cast that into `[[String: AnyObject]]`. Then, by comparing bundle identifier, we can know whether it's enabled.

```swift
jobs.contains(where: { $0["Label"] as! String == launchHelperIdentifier }) ?? false
```

Although `SMCopyAllJobDictionaries` is deprecated, it is still the preferred API to use according to [@BlindDog](https://github.com/alexzielenski/StartAtLoginController/issues/12). Plus if you're using Objective-C, here is how to get rid of the annoying deprecated warning:

```c
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
  CFArrayRef  cfJobDicts = SMCopyAllJobDictionaries(kSMDomainUserLaunchd);
#pragma clang diagnostic pop
```
Sadly Swift 4 still doesn't include a preprocessor, so this is a Objective-C only solution.

Ouch!

## Summary

For easy use in the future, we can create a computed property like this:

```swift
let launchHelperIdentifier = "com.your.launchHelperIdentifier"

var launchAtStartup: Bool {
  get {
      let jobs = SMCopyAllJobDictionaries(kSMDomainUserLaunchd).takeRetainedValue() as? [[String: AnyObject]]
      return jobs?.contains(where: { $0["Label"] as! String == launchHelperIdentifier }) ?? false
  }
  set {
      SMLoginItemSetEnabled(launchHelperIdentifier as CFString, newValue)
  }
}
```

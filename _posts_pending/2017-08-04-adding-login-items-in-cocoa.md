---
title: Adding Login Items in Cocoa
summary: Here is a simple guide on how to add login item using Service Management Framework.
---

There’s a lot of guides and simple code out there showing you how to add your login item. But sadly most of them are (or will be) deprecated, so here is how to make our app launch on login, version 2017.

## The most recommended way: Service Management Framework

This is probably the most recommended approach if we need to keep our app sandboxed.

We provide a helper application inside our main application bundle to Service Management Framework which can help start the helper application in every login.

### Add and configure helper application

Say we have a working project already, go to project settings (the blueprint icon under project navigator), add a Cocoa App to the targets.

Now we need to do some configurations.

For helper application target:

- in **Info** tab, under **Custom macOS Application Target Properties** section, add a new property named `Application is background only` and set it to `true` .
- In **Build Settings** tab, under **Deployment** section, set `Skip Install` to `YES` .

For main application target:

- In **Build Phases** tab, click the plus button on the top left corner and select **New Copy File Phase** (skip this if you already have one). Set **Destination** to `Wrapper`, **Subpath** to `Contents/Library/LoginItems` and add you helper app to the list.
- In **General** tab, add the helper app to **Embedded Binaries**.

### Time for some code!

Here is how it works:

1. register helper as login item
2. when login, system launch the helper
3. helper launch our main application
4. main application kill helper

It's super simple to register our helper, all we need to do is to call `SMLoginItemSetEnabled` .

```swift
import ServiceManagement

let launchHelperBundleIdentifier = "com.your.launchHelperBundleIdentifier" as CFString

func setLaunchOnLogin(to: Bool) {
    SMLoginItemSetEnabled(launchHelperBundleIdentifier, to)
}
```


## Not a big fan of sandbox? Try Shared File List

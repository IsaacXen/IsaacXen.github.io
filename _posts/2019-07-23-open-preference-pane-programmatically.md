---
layout: post
series: Cocoa 速记 
title: 使用代码打开指定偏好设置面板
tags: [cocoa, macos, swift, appkit, applescript, urlscheme]
lang: zh
---

有些时候，我们的程序会需要向用户请求权限。与 iOS 不同，在 macOS 上往往不会弹出确认框来向用户请求权限，而是需要用户前往系统偏好设置来开启权限。这时，我们往往会需要使用代码打开指定偏好设置面板，来引导用户进行授权操作。

## 找到偏好设置面板

我们要打开的偏好设置面板文件一般存储在以下路径：

```shell
# system preference panes
/System/Library/PreferencePanes/
# user-installed system-wided preference panes
/Library/PreferencePanes/
# user-installed user-wided preference panes
~/Library/PreferencePanes/
```

在这些位置，你可以会找到各个控制面板所对应的 `.prefpane` 文件。`.prefpane` 文件下可以找到接下来会用到的内容，如 `Info.plist` 里的 Bundle Identifier。

## 方法 1: 使用 URL Scheme 打开指定面板

部分控制面板支持通过 URL Scheme 进行访问。在各个控制面板对应的 `.prefpane` 文件里的 `Info.plist` 中，如果有下面这一键值对，则表示这个面板支持 URL Scheme:

```xml
<key>NSPrefPaneAllowsXAppleSystemPreferencesURLScheme</key>
<true/>
```

控制面板的 URL Scheme 格式是 `x-apple.systempreferences:` 前缀加上面板的 Bundle Identifier：

![](/assets/img/c9122256-9ba4-46a4-a9bd-7c27bbbd38d1.svg)

有些面板支持锚点，可以在 URL Scheme 后面加入锚点名称来访问控制面板的某个区域:

![](/assets/img/8bcb782a-95fc-43cd-8eeb-a04984eedf3c.svg)

如 *安全性与隐私 → 隐私 → 辅助功能* 的 URL Scheme 为：

```
x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility
```

> <details><summary markdown="span">如何查询可用锚点？</summary>
>
> 你可以在 Script Editor 中执行
>
> ```applescript
> tell application "System Preferences"
>   anchors of pane "com.apple.preference.network"
> end tell
> ```
> 
> 来查找指定面板下的所有可用锚点。
> 
> </details>

最后在代码中，通过 `NSWorkspace` 的 `open(_:)` 方法便可以打开与 URL Scheme 对应的偏好设置面板:

```swift
let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
NSWorkspace.shared.open(url)
```

## 方法 2: 使用 AppleScript 打开指定面板

另一种方法是使用 AppleScript 来打开控制面板：

```applescript
# reveal pane
reveal pane "com.apple.preferences.extensions"
# reveal pane with anchor
reveal anchor "dns" of pane "com.apple.preference.network"
```

你只需要指定特定面板的 Bundle Identifier 和锚点即可。如打开 *系统偏好设置 → 网络 → 高级 → DNS* 面板，可以使用下面的脚本来打开：

```applescript
tell application "System Preferences"
  reveal anchor "dns" of pane "com.apple.preference.network"
  activate
end tell
```

> <details><summary markdown="span">如何查询可用锚点？</summary>
>
> 你可以在 Script Editor 中执行
>
> ```applescript
> tell application "System Preferences"
>   anchors of pane "com.apple.preference.network"
> end tell
> ```
> 
> 来查找指定面板下的所有可用锚点。
> 
> </details>

对于一些需要输入用户密码才能进行修改的面板，你还可以通过下面的脚本来主动弹出解锁对话框：

```applescript
authorize pane "com.apple.preferences.password"
```

在代码中执行 AppleScript 脚本非常简单，使用 `NSAppleScript` 即可执行脚本:

```swift
let script = /* Some AppleScript Here */

var err: NSDictionary?
if let scriptObject = NSAppleScript(source: script), let output = scriptObject?.executeAndReturnError(&err) {
    print(output.stringValue)
} else {
    // something's wrong
}
```

> `executeAndReturnError(_:)` 方法是同步执行的，这意味着，你的用户界面有可能会被它锁住，特别是在执行耗时脚本的时候。在必要时，请将它放到独立的线程中执行。
{:.warning}

> 在沙盒环境下，某些 AppleScript 操作需要沙盒权限才能使用，如 `reveal`，`activate` 等。
>
> <details><summary markdown="span">更多详情</summary>
> 
> 你可以在 Entitlements 文件中添加 `com.apple.secirity.scripting-targets` 来请求对应权限：
>
> ```xml
> <key>com.apple.security.scripting-targets</key>
> <dict>
>     <key>com.apple.systempreferences</key>
>     <string>preferencepane.reveal</string>
> </dict>
> ```
> 
> 在某些时候，你也许会遇到 `activate` 无法将系统偏好设置窗口前置的问题。这时候，你可以选择在执行脚本前，预先通过 `NSWorkspace` 启动系统偏好设置：
> 
> ```swift
> NSWorkspace.shared.launchApplication(withBundleIdentifier: "com.apple.systempreferences", options: [], additionalEventParamDescriptor: nil, launchIdentifier: nil)
> ```
>
> > 在修改 Entitlements 文件后，你有可能会遇到类似 *"Entitlements was modified during the build, which is not supported"* 的错误。这时，你可以尝试清空你的 *Build Settings → Code Signing Entitlements* 的值。
> 
> 此外，从 macOS Mojave 开始，你也可以在 `Info.plist` 添加 `NSAppleEventsUsageDescription` 来申请 AppleEvent 权限：
>
> ```xml
> <key>NSAppleEventsUsageDescription</key>
> <string>This application needs to control other applications to launch System Preferences for you when needed.</string>
> ```
>
> </details>

此外，在 OS X 10.8 Mountain Lion 中，苹果引入了 `NSUserAppleScriptTask` 来允许更安全地执行 AppleScript。如果你想了解更多，不妨看看 [Craig Hockenberry 的 Scripting from a Sandbox](https://www.objc.io/issues/14-mac/sandbox-scripting) (或者 [@onevcat 的译文](https://objccn.io/issue-14-2/))。

## 小结

在真实环境下，并不是所有时候都能够保证你的程序拥有执行这些操作的权限。

如果你不能通过代码为你的用户打开特定的控制面板，至少你应该通过简单的文字或图片描述来引导用户如何进行下一步操作。如：“前往 *系统偏好设置 -> 通知* 以进行更多通知相关的设置。”
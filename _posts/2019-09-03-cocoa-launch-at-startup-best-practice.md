---
layout: post
series: Cocoa 速记
title: 实现程序自启动的最佳实践
tags: [macos, swift, appkit, servicemanagement, launchd, loginitem]
lang: zh
---

在 macOS 中实现开机自启动似乎是一个特别需要技巧的事情。也许是为了解决过去遗留的问题，过去许多实现自启动的方法都被苹果标记为过时，网络上的许多教程也因此变得不怎么靠谱。

我们并不清楚未来苹果是否还会做出什么修改，不过，在面向现代的 Cocoa 程序编程中，使用 Service Management 框架来实现自启动是唯一被推荐的做法[^1]。并且，如果你希望在沙盒程序中实现开机自启动，使用 Service Management 框架也是你实现自启动的唯一途径[^2]。

## 使用 Service Management 框架实现自启动

我们将需要一个启动项程序 (Login Item) 来帮助启动我们的主程序。下面展示了程序自启动的大概流程：

1. 首先，你通过 Service Management 注册启动项到 launchd 中
2. 每当用户登录时，launchd 会启动你的启动项
3. 你的启动项被启动后，你在启动项中唤醒主程序
4. 最后，你在适当的时机将启动项退出

下面我们通过在已有的项目中添加启动项来了解启动项的实现。

### 创建并配置启动项

在主程序的项目中，点击 *Project Navigator → Your Project → Project and Targets List* 中的 *"+"* 按钮来添加一个 *Application → Cocoa App* 目标，它将是你的启动项程序。

你可以将它命名为任何名称，不过一般来说，我们会将它命名为 `ProjectName + Helper` 或 `ProjectName + LoginItem`。

下面我们将对主程序目标与启动项程序目标进行一些配置：

对于你的启动项程序目标:

> - 在 *Info → Custom macOS Application Target Properties* 下，添加下方两个条目中的其中一条，并将其值设置为 `YES`，来将启动项设置为后台驻留程序:
>
>  > | Property List Key                | Source Code Key    |
>  > |----------------------------------|--------------------|
>  > | Application is background only   | `LSBackgroundOnly` |
>  > | Application is agent (UIElement) | `LSUIElement`      |
>  >
>  {:.indent}
> 
> - 将 *Build Settings → Deployment → Skip Install* 的值设置为 `YES`。
{:.indent}

由于我们需要将启动项注册到 launchd 中，而后者只接受后台驻留程序，因此我们需要将注册项设置为后台驻留程序。启动项唯一需要做的事情只有启动主程序，因此，启动项甚至不需要任何界面，你可以放心地在启动项项目中去除用户界面。

设置 Skip Install 为 `YES` 表示在打包时跳过该目标，这主要影响需要打包并上传到 Mac App Store 时的情况。默认情况下，Xcode 在打包时会将该项目下静态库、命令行等所有子目标都打包到一个档案中，而 Mac App Store 只接受上传的档案中只有单一程序包的情况。通过将 Skip Install 设置为 `YES`，Xcode 将在打包时跳过该目标，不会将其复制到档案中。

接下来，我们会把启动项内嵌到主程序中。对于你的主程序目标:

> - 在 *Build Phases* 下，添加一个 *Copy File Phase*。设置其 *Destination* 为 `Wrapper`，*Subpath* 为 `Contents/Library/LoginItems`，并在下方的列表中添加你的启动项目标。
>
> 完成后，你会在 *General → Embedded Binaries* 下的列表中，看到你的启动项目标 (如果没有的话，请手动将它添加)。
{:.indent}

这一操作告诉 Xcode 在打包时需要将启动项拷贝到主程序包中。`Contents/Library/LoginItems` 这个路径是固定的，当我们使用 Service Management API 来注册启动项时，它只会在这个目录中查找启动项。如果你使用了错误的路径，在调用 Service Management API 时，你将会遇到找不到启动项的错误。

> 有人建议还需要在主程序中将 *Build Settings → Strip Debug Symbols During Copy* 设置为 `No` 来避免打包时可能出现的错误，这一点我是反对的。当 *Strip Debug Symbols During Copy* 设置为 `Yes` 的时候，我并没有遇到过任何的问题 (也许是因为较新版本的 Xcode 解决了这个问题)。
> 
> 将它设置为 `No` 没有任何的好处，反而会大幅增加打包后程序的大小，同时项目也需要花费更长的时间来编译，即便是在 Debug 环境下。所以我的建议是 - **永远将其设置为 `YES`**。

### 在启动项中启动主程序

就如我们上面所说到的一样，启动项中需要进行的操作十分简单。

我们可以在 [`applicationDidFinishLaunching(_:)`] 方法中调用 [`NSWorkspace`] 的 [`launchApplication(at:options:configuration:)`] 方法来唤醒主程序，这个方法需要我们传入目标程序的路径。由于我们的启动项内嵌于主程序中，且路径是固定的，因此，我们可以通过当前启动项的路径，稍作修改，得到主程序的路径:

```swift
// getting the bundle url of main application
let url = [Int](repeating: 0, count: 4).reduce(Bundle.main.bundleURL) { (url, _) -> URL in
    url.deletingLastPathComponent()
}
```

上面所做的，仅仅是通过 [`Bundle.main.bundleURL`] 获取当前启动项的路径，往上回退 4 个目录，从而得到主程序的路径。这听起来似乎很荒唐，但这确实是一个可靠且简单的方法。

```shell
MyFancyApplication.app/               # Main application
+ Contents/Library/LoginItems/        # Directory that store all login items
  + MyFancyApplicationLoginItem.app/  # The login item (or helper application if you prefer)
```

如果你觉得这种方法不可靠，你还是可以通过其他方法来获取主程序的路径，如使用 [`NSWorkspace`] 的 [`urlForApplication(withBundleIdentifier:)`] 方法来获取指定包标识的程序路径。

得到了主程序的路径以后，我们可以开始我们的唤醒操作了:

```swift
try? NSWorkspace.shared.launchApplication(at: url, options: [.withoutActivation], configuration: [:])
```

> 倘若你的主程序是后台驻留程序，请确保 `options` 中的选项集中不包含 `.inhibitingBackgroundOnly`，否则，唤醒操作将会失败。

> 从 macOS 10.15 Catalina 开始，[`launchApplication(at:options:configuration:)`] 被标记为过时，请使用 [`openApplication(at:configuration:completionHandler:)`] 取代。
{:.info}

在完成唤醒后，你可以选择调用 [`terminate(_:)`] 方法来退出启动项程序。

### 在主程序中注册启动项

注册启动项非常的简单，我们只需要调用 [`SMLoginItemSetEnabled(_:_:)`] 方法即可：

```swift
import ServiceManagement

// SMLoginItemSetEnabled accept two parameters, 
// the first one is the bundle identifier of your login item, 
// the second one is a Boolean value indicate the enabled state of the login item.
SMLoginItemSetEnabled("com.your.loginItemIdentifier" as CFString, true)
```

你需要传入你的启动项程序的包标识，以及表示目标启动项启用状态的布尔值。这个设置仅对当前用户生效。

> 如果多个程序 (如多个来自通过同一开发者的程序) 所注册的启动项程序的包标识是相同的，那么系统只会启动一个包版本最新的助手程序。任何内嵌了该助手程序副本的程序都可以控制它的启用或禁用。
{:.warning}

### 读取启动项状态

我们还需要在程序设置中提供一个选项来控制自启动的开启与否，这意味这我们需要获取自启动是否已经被注册到 launchd 中。

网上普遍推荐使用 Service Management 中的 [`SMCopyAllJobDictionaries(_:)`] 方法的结果来判断启动项的状态:

> [`SMCopyAllJobDictionaries(_:)`] 返回指定域名下的所有注册的程序信息:
>
> ```swift
> let jobs = SMCopyAllJobDictionaries(kSMDomainUserLaunchd).takeRetainedValue() as? [[String: AnyObject]]
> ```
>
> 通过在返回的结果集中判断是否存在我们的启动项标识，便可以得知我们的启动项是否被注册 (启用):
>
> ```swift
> jobs.contains(where: { $0["Label"] as! String == "com.your.LoginItemIdentifier" })
> ```
>
> 尽管 [`SMCopyAllJobDictionaries(_:)`] 被标记为过时方法，据 [@BlindDog] 称，通过询问苹果开发者得知，它依旧是适合使用的方法。
{:.indent}

也许是强迫症在作怪，使用一个被标记为过时的方法，并且还要自行去无视警告，对我来说是无法接受的事情。如果非得读取启动项状态，我会宁可选择直接通过 `launchctl` 来获取状态：

> ```shell
> launchctl list com.your.LoginItemIdentifier
> ```
>
> 如果存在，它会返回如下启动项的信息:
>
> ```shell
> {
>   "EnableTransactions" = true;
>   "LimitLoadToSessionType" = "Aqua";
>   "MachServices" = {
>     "com.your.LoginItemIdentifier" = mach-port-object;
>   };
>   "Label" = "com.your.LoginItemIdentifier";
>   "OnDemand" = true;
>   "LastExitStatus" = 0;
>   "Program" = "com.your.LoginItemIdentifier";
> };
> ```
>
> 而当不存在时，它会返回错误信息:
>
> ```
> Could not find service "com.your.LoginItemIdentifier" in domain for port
> ```
>
> 在程序中使用 [`Process`] 与 [`Pipe`] 或者其他方法来执行 shell 脚本，判断返回结果字符串即可。
>
{:.indent}

但实际上，我会选择放弃读取启动项的状态，取而代之的是以程序中保存的状态值为准来设置自启动的状态：

> 比如说，在 UserDefaults 中使用 `launchAtStartup` 来作为启动项是否启用的标识。在执行状态切换时，从 UserDefaults 中读取:
>
> ```swift
> func toggleLaunchAtLogin() {
>   // retrive from UserDefaults, which return `false` if `launchAtStartup` not exist
>   let launchAtStartup = UserDefaults.standard.bool(forKey: "launchAtStartup")
>   // toggle launchAtStartup with Service Management API
>   SMLoginItemSetEnabled("com.your.LoginItemIdentifier" as CFString, !launchAtStartup)
>   // update UserDefaults
>   UserDefaults.standard.set(!launchAtStartup, forKey: "launchAtStartup")
> }
> ```
>
> 而当需要读取启动项状态来初始化按钮状态时，我们从 UserDefaults 中获取 `launchAtStartup` 的值，并且在每次读取后重新调用 [`SMLoginItemSetEnabled(_:_:)`] 方法设置启动项状态:
> 
> ```swift
> let launchAtStartup = UserDefaults.standard.bool(forKey: "launchAtStartup")
> SMLoginItemSetEnabled("com.your.LoginItemIdentifier" as CFString, launchAtStartup)
> ```
>
> 这样一来，启动项的状态将一直保证符合我们程序的期望。即便用户通过第三方程序将我们的启动项禁用，只要我们的程序设置窗口没有被打开，那么，启动项将维持用户在第三方程序中所设置的值，直到用户再一次打开程序的设置窗口。
>
> 这时，程序会根据 UserDefaults 中的值来重新设置启动项状态，这虽然覆盖了用户在第三方程序中所作出的修改，不过，我们程序的自启动控制按钮已经在屏幕中可见，即便需要用户重新设置，也只需要一次点击便能做到。
>
> 此外，在初始状态时，由于我们没有在 UserDefaults 中写入键为 `launchAtStartup` 的值，因此，UserDefaults 会返回它的默认值 `false`，也就是不开启自启动功能，这也符合上传到 Mac App Store 所需要的要求。
>
{:.indent}

> 作为 macOS 中的一个良好公民，你的程序应该提供控制自启动的选项。如果你的程序有自启动功能，并且需要在 Mac App Store 中发布，你的程序**必须**提供该选项，并且默认关闭自启动。

## 小结

写下这篇速记的原因主要是为了在其他人问我应该如何实现自启动时能够直接把这边文章的链接砸到他们的脸上，然后才是作为一个记录而写下。虽然说是速记，但也花费了不少时间在考古和试验上，而且整理、排版和校对是真的难受。

一开始是想要将所有实现自启动可行的办法整合在一起，做一个总结和对比的。结果，苹果将除了文中介绍的方法以外的方法所涉及到的 API 都标记为过时，特别是 Shared File List 的方法，我个人是很喜欢能够在一个地方管理所有启动项的。

> 本文所展示的代码省去了对可能发生的错误所进行的处理。在你的实现中，你应该加上这些代码。

[`NSWorkspace`]: https://developer.apple.com/documentation/appkit/nsworkspace
[`launchApplication(at:options:configuration:)`]: https://developer.apple.com/documentation/appkit/nsworkspace/1534810-launchapplication
[`openApplication(at:configuration:completionHandler:)`]: https://developer.apple.com/documentation/appkit/nsworkspace/3172700-openapplication
[`urlForApplication(withBundleIdentifier:)`]: https://developer.apple.com/documentation/appkit/nsworkspace/1534053-urlforapplication
[`Bundle.main.bundleURL`]: https://developer.apple.com/documentation/foundation/bundle/1415654-bundleurl
[`terminate(_:)`]: https://developer.apple.com/documentation/appkit/nsapplication/1428417-terminate
[`Process`]: https://developer.apple.com/documentation/foundation/process
[`Pipe`]: https://developer.apple.com/documentation/foundation/pipe
[`applicationDidFinishLaunching(_:)`]: https://developer.apple.com/documentation/appkit/nsapplicationdelegate/1428385-applicationdidfinishlaunching
[`SMLoginItemSetEnabled(_:_:)`]: https://developer.apple.com/documentation/servicemanagement/1501557-smloginitemsetenabled
[`SMCopyAllJobDictionaries(_:)`]: https://developer.apple.com/documentation/servicemanagement/1431086-smcopyalljobdictionaries

[@BlindDog]: https://github.com/alexzielenski/StartAtLoginController/issues/12

[^1]: [Adding Login Items Using the Service Management Framework - Daemons and Services Programming Guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLoginItems.html#//apple_ref/doc/uid/10000172i-SW5-SW1)

[^2]: [Creating a Login Item for Your App - App Sandbox Design Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/AppSandboxDesignGuide/DesigningYourSandbox/DesigningYourSandbox.html#//apple_ref/doc/uid/TP40011183-CH4-SW3)

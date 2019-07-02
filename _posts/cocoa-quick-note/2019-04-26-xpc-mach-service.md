---
layout: post
series: Cocoa 速记
title: XPC - Mach Service
tags: [cocoa, macos, swift, xpc]
hidden: true
---

你可以通过 `NSXPCLisnener(machServiceName:)` 创建一个用于在 `launchd.plist` 中宣传的后台驻留程序的 XPC 监听器。这个 Mach Service 存在于你的 App Bundle 以外，在用户会话或者系统会话中由 launchd 启动 (取决于使用的是 launch agent 还是 launch daemon)。同一个会话中的不同程序可以通过 `NSXPCConnection(machServiceName:)`  与这个 Mach Service 建立 XPC 连接。

![](/assets/img/19042601.svg)


这种方法有下面这些的使用场景：

- 你使用一个 mach service 来统一管理你开发的多个程序的在线更新。
- 你的程序拥有一个独立的菜单栏程序或者一个通知中心 widget，它们都通过这个 mach service 访问你的服务器进行数据获取。

- 你借助这个 mach service 与在不同程序之间建立匿名连接进行通讯 (这将是我们以后会讲到的内容)。



1. server init listener
2. set delegate
3. resume
4. 



接下来，我们会创建一个程序 Sum，它的主要功能是对两个整数进行加法运算并返回结果。程序的运算在独立的 launch agent `SumAgent` 中进行，其他程序也可以通过 `SumAgentProtocol` 协议连接到这个 launch agent 进行运算。

<blockquote class="info"><p>本文所有内容都是基于 <strong>非沙盒程序</strong> 进行讲解。</p></blockquote>

## 示例程序 - Sum

在 Xcode 新建一个macOS - Cocoa App 项目，在本例中，我们将其命名为 `Sum`。

这个是我们的主程序，在安装它时，我们可以选择性地安装 launch agent。我们接下来会创建这个 launch agent `SumAgent`，不过，在此之前，我们先确定好我们的 SumAgent 公开的协议。

### 决定服务允许的协议

如上一篇文章所说，协议决定了 XPC service 能进行的操作，这个协议在服务端 (XPC Service) 以及客户端 (程序) 都是确定的。

由于是示例，在这里，我们的协议 `SumAgentProtocol` 非常简单:

```swift
@objc protocol SumAgeentProtocol {
  func sum(_ lhs: Int, _ rhs: Int, withReply reply: @escaping (Int) -> ())
}
```

它只有一个方法 `sum(_:_:withReply:)`，它接收两个整数，并在闭包中返回两数相加的结果。

### 创建 Launch Agent

创建一个新的 **Cocoa App** Target，并将其命名为 `SumAgent`。

> 注意，我们这里创建的是 **Cocoa App** Target，而非 **XPC Service** Target，后者创建的是内嵌于 App Bundle 里的 XPC Service，而我们需要的是一个可以用作 launch agent 或 launch daemon 的 Cocoa App。

我们的 launch agent 运行于后台，不需要任何界面，因此，我们可以安全地

- 删除 `Main.storyboard`，`AppDeelgate.swift`，`ViewController.swift`, `Assets.xcassets` 文件
- 删除 Project Inspector → **SumAgent** Target → Deployment Into → Main Interface 项的内容
- 在 `Info.plist` 中添加 `Application is agent (UIElement)` (`LSUIElement`) 条目，并设置其值为 `YES`

接下来的步骤和创建一个 XPC Service 类似 (毕竟说到底这就是个 XPC Serivce)，除了在创建 `main.swift` 文件的时候有些小变化以外:

```swift
// Use this to create XPC listener instead.
let listener = NSXPCListener(machServiceName: "com.example.Sum.SumAgent")
let delegate = SumAgent()
listener.delegate = delegate
listener.resume()  // This function returns immediately.
RunLoop.current.run() // So we run the runloop to prevent application exit.
```

剩下的代理回调 `SumAgent.swift`:

```swift
class SumAgent: NSObject, NSXPCListenerDelegate, SumAgentProtocol {
  func listener(_ listener: NSXPCListener, shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
    newConnection.exportedInterface = NSXPCInterface(with: SumAgentProtocol.self)
    newConnection.exportedObject = self
    newConnection.resume()
    return true
  }
  
  func sum(_ lhs: Int, _ rhs: Int, withReply reply: @escaping (Int) -> ()) {
    reply(lhs + rhs)
  }
}
```

与创建 XPC Service 无异。

> 在创建监听器的时候，我们使用了 `com.example.Sum.SumAgent` 作为 mach service 的唯一标识。这个标识的内容是由你决定的，但是请注意，不管你使用的是什么内容，你都将使用同一个标识来进行广播和连接。

### 配置 Launch Agent

首先宿主程序中进行一些配置，以保证在编译以及打包时 launch agent 的二进制文件会被放置到主程序的 Bundle 中，以便于我们后期将其安装至程序外的位置 (如 Application Support)。

在Project Instector →  **Sum** Target → Build Phases 中新建一个 **Copy File** Phase。配置 Destination 为 Warpper，Subpath 为 `Contents/Library/LaunchServices`，并添加 `SumAgent.app` 到列表中。

> 这里的路径并不是固定的，你可以指定一个你认为合理的路径。

此外，我们还需要准备一个launchd plist 文件 `com.example.Sum.SumAgemt.plist` ，放置到 `~/Library/LaunchAgents` 中，以注册我们的 launch agent。由于这个 plist 中存在动态内容，因此，我们会下一节中通过代码来创建这个 plist 文件。

这个 plist 中有一个地方需要额外注意：为了让你的 service 能在 mach services 中进行推广，在 plist 文件中必须特别注明需要推广的 service 的标识：

```xml
<!-- This required key uniquely identifies the job to launchd. -->
<key>Label</key>
<string>com.example.Sum.SumAgent</string>
<!-- Specify Mach services to be registered with the Mach bootstrap namespace. -->
<!-- This is required in order for our service to be advertised. -->
<key>MachServices</key>
<dict>
  <key>com.example.Sum.SumAgent</key>
  <true/>
</dict>
```

> 本篇主要讲解关于创建 Mach Service 进行 XPC 连接，对于 launchd plist 等如何创建 Launch Agent 或 Daemon 的内容不会进行太多的解释。如果你需要了解这方面的知识，请参考下列链接或文档：
>
> - [Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html#//apple_ref/doc/uid/10000172i-SW7-BCIEDDBJ)
> - `launchd.plist` man page

现在，我们可以在宿主程序中提供 agent 的安装了。

### 安装 Launch Agent

不同于嵌入式的 XPC Service，使用 Mach Service 的后台驻留程序不会自动安装，我们需要手动:

- 复制后台驻留程序到其他路径，如 Application Support 中

  > 这一步并不是必要的，但是，为了隔离宿主程序对 launch agent 的影响 (如程序更新时需要进行 `.app` 文件替换，如果 package 中的 launch agent 正在运行，替换将无法进行)，我们往往会将 launch agent 的存放到非宿主程序 package 中，`~/Library/Application Support` 是一个比较合理的位置。

- 复制 launchd plist 文件到 launchd 搜索路径中

- 加载后台驻留程序到 launchd 中

  > 这一步也不是必要的。在每次会话开始时，launchd 都会自动加载存放在搜索路径下的 plist 文件。这一步仅仅是为了在已运行会话中进行立即加载我们的 plist 文件到 launchd 中。

在我们的例子中，我们可以通过下面的方法进行 launch agent 的安装:

```swift
// 1. Copy agent to Application Support.

let agentFromPath = Bundle.main.bundlePath.appending("/Contents/Library/LaunchAgents/SumAgent.app")
let asPath = NSSearchPathForDirectoriesInDomains(.applicationSupportDirectory, .userDomainMask, true).first!
let agentToPath = asPath.appending("/Sum/LaunchAgents/SumAgent.app")

FileManager.default.copyItem(atPath: agentFromPath. toPath: agentToPath)

// 2. Generate launchd plist file.

let userDir = NSSearchPathForDirectoriesInDomains(.userDirectory, .userDomainMask, true).first!
let plistToPath = userDir.addending("/Library/LaunchAgents/com.example.Sum.SumAgent.plist")

let plist = [
  "Label": "com.example.Sum.SumAgent",
  "ProgramArguments": [
    agentToPath.appending("/Contents/MacOS/SumAgent")
  ],
  "MachServices": [
    "com.example.Sum.SumAgent": true
  ]
] as NSDictionary

plist.write(toFile: plistToPath, atomically: true)

// 3. Load agent to launchd.

let process = Process()
process.launchPath = "/bin/bash"
process.arguments = ["-c", "launchctl load \(plistToPath)"]
```

> 上面的代码中省略了大量的错误处理，如检查目录是否存在，文件是否存在等。在实际的项目中，你应该处理这些情况。

这样，我们的后台驻留程序就完成安装了。

> 使用代码只是其中一种方法。实际上，如果你的程序通过 pkg 分发，你可以借助 pkg 的安装脚本进行这些操作。或者，如果通过 dmg 分发，提供独立的安装脚本也是一种方法。

### 在程序中发起 XPC 连接

完成 launch agent 的安装以后，我们可以在宿主程序中使用 `NSXPCConnection(machServiceName:)` 建立与 launch agent 之间的 XPC 连接了。

```swift
let connection = NSXPCConnection(machServiceName: "com.example.Sum.SumAgent")
connection.remoteObjectInterface = NSXPCInterface(with: SumAgentProtocol.self)
connection.resume()
// fetch remote object proxy
let remoteObject = connection.remoteObjectProxyWithErrorHandler { err in
  print(err)
} as? SumAgentProtocol
// call remote function
remoteObject?.sum(1, 1, withReply: { result in
  print(Reply from agent: \(result))
})
```

即便你创建一个新的 Cocoa App 项目，通过上面的方法也是能够建立起连接的。
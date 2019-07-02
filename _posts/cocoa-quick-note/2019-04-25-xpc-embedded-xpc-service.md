---
layout: post
series: Cocoa 速记
title: XPC - 常规 XPC 服务
tags: [cocoa, macos, swift, xpc]
hidden: true
---

一个常规的 XPC 服务存在于你的程序 Bundle 下，它只能与 Bundle 内的程序建立连接，对 Bundle 外的程序是不可见的。

![](/assets/img/19042501.svg)

从 Xcode 创建一个 XPC 服务时，它会以包的形式存放在程序的 `Contents/XPCServices/` 下。每个服务的包里包含了该服务的可执行二进制文件、Info.plist，以及运行这个服务所需要的资源文件。

```
MyFancyApp.app                              // Main Application
+ Contents/XPCServices/                     // Location to store all XPC services
  + com.example.MyFancyApp.uploader.xpc
  + com.example.MyFancyApp.decoader.xpc
    + com.example.MyFancyApp.decoder        // Executable binary
    + Info.plist                            // Info plist
    + Resources/                            // Resources to use in this XPC service
```

## XPC 连接的过程

一个普通的 XPC 连接流程有下面几步:

![](/assets/img/19042502.svg)

- 使用 `NSXPCConnection(serviceName:)` 创建一个连接对象
- 通过 `remoteObjectInterface` 设置连接允许的通讯协议
- 调用 `resume()` 开始连接
- 程序连接到 launchd
- launchd 唤醒 XPC 服务
- 监听器调用 `listener(_:shouldAcceptNewConnection:)` 代理方法
- 通过 `exportedObject` 设置出口对象
- 通过 `exportedInterface` 设置出口协议
- 调用 `resume()` 允许接收信息
- 返回 `true` 表示连接已被接受

这时，XPC 连接已建立，在主程序中，你可以通过 `remoteObjectProxyWithErrorHandler(_:)` 获取 XPC 服务的远程对象代理。调用这个代理的方法时，XPC 服务中对应的对象会调用相应的方法。

## 创建并使用 XPC 服务

在 Xcode 中，新建一个 *XPC Service* Target。Xcode 会为你创建一系列使用 NSXPCConnection API 的模板文件。

> <details><summary markdown="span">创建 *XPC Service* Target 时，Xcode 还会帮你做一些额外的事情。</summary>
> 
> 它会:
>
> - 将这个 XPC 服务添加到宿主程序的 *Build Phases* ➔ *Embed XPC Services (Copy Files)* 中，*Destination* 为 *XPC Services (Contents/XPCServices)*。
> - 将这个 XPC 服务添加到宿主程序的 *Build Phases* ➔ *Target Dependencies* 中。
> - 将这个 XPC 服务添加到宿主程序的 *General* ➔ *Embedded Binaries* 中。
> </details>

> <details><summary markdown="span">Xcode 创建的模板是基于 Objective - C 语言的，即便你使用的是 Swift。如果你想使用 Swift 来进行开发，你将需要进行一些额外的操作。</summary>
> 
> 你需要将 `.h` 以及 `.m` 文件删除，并手动创建与它们对应的 `.swift` 文件。此外，你还需要在这个 Target 的 *Build Settings* 中:
>
> - 配置 *Linking* ➔ *Runpath Search Paths* 为 `@loader_path/../../../../Frameworks`。
> - 配置 *Swift Compiler* - *General* ➔ *Install Objective-C Compatibility Header* 为 `No`。
> - 配置 *Swift Compiler - General* ➔ *Objective-C Generated Interface Header Name* 为空。
> - 配置 *Swift Compiler - Language* ➔ *Swift Language Version* 为你偏好的 Swift 版本。
>
>  在这个 Target 中创建的 `.swift` 文件，你需要在 *Build Phases* ➔ *Compile Sources* 中添加它们。
> </details>

请注意这个 Target 的 Bundle Identifier，它将是我们建立到这个 XPC 服务的连接时所需要的的标识。

### 配置 Info.plist

### 声明协议

首先，我们需要创建一个协议。这个协议声明了这个 XPC 服务对外所能进行的操作，这里声明的方法允许被 XPC 连接的另一方所调用。

```swift
@objc protocol XPCServiceProtocol {
  func sum(_ lhs: Int, _ rhs: Int, withReply reply: @escaping (Int) -> ())
}
```

在创建这个协议时，有一些地方需要你的注意:

- 由于 NSXPCConnection API 是基于 XPC Service API 的一层封装，为了让连接能够使用这一协议，你必须使用 `@objc` 来将其暴露给 Objective - C。
- XPC 通讯是异步进行的，因此你的方法不应该有返回值。如果你的函数需要返回结果，你应该使用一个回复闭包来返回这些结果。但是请注意，您的函数最多只能包含一个回复闭包。
- XPC 对于协议中出现的数据类型有严格的限制。你只能使用下列数据类型:
  - 数字 (`Int`, `CChar`, `Float`, `Double`, `NSNumber`…)
  - 布尔 (`Bool`, `CBool`…)
  - 字符串 (`String`, `NSString`…)
  - 数据 (`Data`, `NSData`…)
  - 集合 (数组、字典、结构体等元素都为上述类型的集合类型)
  - 其他实现了 `NSSecureCoding` 的对象 (`NSColor`, `NSRect`…)
  
    > <details><summary markdown="span">如果你需要在协议中使用你的自定义类型，你的自定义类型必须实现 `NSSecureCoding` 协议。</summary>
    >
    > > Note: Before you read this section, you should read the chapters Serializations and Serializing Property Lists in Archives and Serializations Programming Guide to learn the basics of object serialization in Mac OS X.
    >
    > The `NSXPCConnection` class limits what objects can be passed over a connection. By default, it allows only known-safe classes—Foundation collection classes, `NSString`, and so on. You can identify these classes by whether they conform to the `NSSecureCoding` protocol.
    > Only classes that conform to this protocol can be sent to an `NSXPCConnection`-based helper. If you need to pass your own classes as parameters, you must ensure that they conform to the `NSSecureCoding` protocol, as described below.
    > However, this is not always sufficient. You need to do extra work in two situations:
    > - If you are passing the object inside a collection (dictionary, array, and so on).
    > - If you need to pass the object by proxy instead of copying the object.
    >
    > All three cases are described in the sections that follow.
    > **Conforming to NSSecureCoding**
    >
    > All objects passed over an NSXPC connection must conform to `NSSecureCoding`. to do this, your class must do the following:
    >
    > - **Declare support for secure coding.** Override the `supportsSecureCoding` method, and make it return `YES`.
    > - **Decode singleton class instances safely.** If the class overrides its `initWithCoder:` method, when decoding any instance variable, property, or other value that contains an object of a non-collection class (including custom classes) always use `decodeObjectOfClass:forKey:` to ensure that the data is of the expected type.
    > - **Decode collection classes safely.** Any non-collection class that contains instances of collection classes must override the **initWithCoder:** method. In that method, when decoding the collection object or objects, always use **decodeObjectOfClasses:forKey:** and provide a list of any objects that can appear within the collection.
    >
    > When generating the list of classes to allow within a decoded collection class, you should be aware of two things.
    >
    > First, Apple collection classes are not automatically whitelisted by the `decodeObjectOfClasses:forKey:` method, so you must include them explicitly in the array of class types.
    >
    > Second, you should list only classes that are direct members of the collection object graph that you are decoding without any intervening non-collection classes.
    >
    > For example, if you have an array of dictionaries, and one of those dictionaries might contain an instance of a custom class called `OuterClass`, and `OuterClass` has an instance variable of type `InnerClass`, you must include `OuterClass` in the list of classes because it is a direct member of the collection tree. However, you do not need to list `InnerClass` because there is a non-collection object between it and the collection tree.
    >
    > Figure 4-3 shows some examples of when whitelisting is required and shows when classes must provide overridden `initWithCoder:` methods.
    >
    > **Whitelisting a Class for Use Inside Containers**
    >
    > </details> 

- 这个协议将被 XPC 连接的双方所使用，因此，您需要将该协议暴露给双方。你可以选中声明的文件，在 *File Inspectors* ➔ *Target Membership* 中勾选你需要暴露给的 Target。

### 创建监听服务

在 `main.swift` 中:

```swift
let listener = NSXPCListener.service() // Create listener object from `NSXPCListener` service method.
let delegate = XPCService()            // Create a delegate class that conforms to `NSXPCConnectionDelegate`.
listener.delegate = delegate           // Configure listener's delegate to our own delegate class.
listener.resume()                      // Begin listening. This function never return.
```

首先，我们通过 `NSXPCListener` 的 `service()` 方法获取一个监听器单例。

然后，我们创建一个 `XPCService` 对象，并设置其为 `listener` 的代理。`XPCService` 是实现了 `NSXPCListenerDelegate` 的类，我们会在稍后创建它。

最后，我们调用 `listener` 的 `resume()` 方法来开始 XPC 服务并监听。在这里，由于我们获取的是单例监听器，这个情况下 `resume()` 函数永远不会返回。

```swift
class XPCService: NSObject, NSXPCListenerDelegate, XPCServiceProtocol {
  // Accept or reject a new connection to the listener.
  func listener(_ listener: NSXPCListener, shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
    newConnection.exportedInterface = NSXPCInterface(with: StringCasterProtocol.self)
    newConnection.exportedObject = StringCaster()
    newConnection.resume()
    return true
  }

  // implementing `XPCServiceProtocol`.
  func sum(_ lhs: Int, _ rhs: Int, withReply reply: @escaping (Int) -> ()) {
    reply(lhs + rhs)
  }
}
```

### 在主程序中连接到 XPC 服务

现在，我们可以在主程序中发起连接请求了。

```swift
let connection = NSXPCConnection(serviceName: "com.example.XPCService")
connection.remoteObjectInterface = NSXPCInterface(with: XPCServiceProtocol.self)
connection.resume()

let remoteObjectProxy = connection.remoteObjectProxyWithErrorHandler {
  print($0)
} as? ImageDownloaderDelegate

remoteObjectProxy?.sum(1, 2) { result in
  print(result) // result is 3
}
```

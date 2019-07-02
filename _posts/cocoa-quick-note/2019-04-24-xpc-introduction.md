---
layout: post
series: Cocoa 速记
title: XPC 简介
tags: [cocoa, macos, swift, nstextfield, appkit]
hidden: true
---

IPC (Inter-process Communication) 是一系列在一个或多个进程中的多个线程之间交换数据的技术。

借助 IPC，我们可以让我们的程序做到 **错误隔离 (Fault Isolation)** 以及 **权限隔离 (Privilege Separation)**。

- **权限隔离** 指通过对程序进行某种设计，以至于当意料之外的事情发生时，它所带来的负面结果是有限且可控的操作。

通过把程序拆分成多个进程来执行不同的工作，当某个进程的工作出现致命错误以导致崩溃时，不会导致整个程序都崩溃。我们甚至可以弹出信息框告知用户，然后重启这个进程。错误隔离降低了发生问题时的潜在伤害，并且使得我们的程序维护起来更加容易。

- **权限隔离** 指的是把程序拆分成多个进程来执行不同的工作，每个进程只赋予完成它们工作所需的最低权限。
  
  这样即便其中某个进程存在一些潜在的漏洞，受限于进程的权限，攻击者也很难访问其他数据。权限隔离让在我们的程序中寻找安全漏洞更加困难，同时这也极大的降低了程序被攻击时可能给用户带来的潜在伤害。

在过去的这么多年里，我们有了很多进程间通信的方法。从 POSIX 的 pipe、socket，到 Mach 的 mach_msg，再到 Foundation 的 NSConnection 等，但是使用这些却可以用痛苦来形容。

XPC 属于 IPC 的一种，它结合了 GCD 和 launchd，提供了一种轻量级的进程间通讯的机制。我们可以使用 XPC 轻松地创建轻量级的 XPC 服务，来将原本需要在主程序中进行的工作分离出来。

## XPC 服务

XPC 服务以包的形式存放在我们程序的 `Contents/XPCServices/` 下。每个 XPC 服务的包里包含了 XPC 服务的可执行二进制文件、Info.plist，以及运行这个服务所需要的资源文件。

```
MyFancyApp.app                              // Main Application
+ Contents/XPCServices/                     // Location to store all XPC services
  + com.example.MyFancyApp.uploader.xpc
  + com.example.MyFancyApp.decoader.xpc
    + com.example.MyFancyApp.decoder        // Executable binary
    + Info.plist                            // Info plist
    + Resources/                            // Resources to use in this XPC service
```

系统通过 Bundle Identifier 来识别 XPC 服务。一般情况下，我们会将 XPC 服务的 Bundle Identifier 设置为主程序的子域。如 com.example.MyApp 程序的 XPC 服务是 com.example.MyApp.MyService。这样做的好处在于我们可以很快地知道这个服务属于哪一个程序，并且知道这个服务是干什么的。

XPC 服务的生命周期由 launchd 进行管理。它会:

  - 在需要的时候自动启动 (On-Demand)
  - 在崩溃的时候自动重启
  - 在空闲的时候自动停止

> 使用着这个 XPC 服务的程序是知晓 XPC 服务的状态的，除了 XPC 在处理某个信息时被终止 (如崩溃)。这个时候，XPC 连接会变成不可用状态，直到 XPC 服务被 launchd 重启。

XPC 服务可以在任何时候被终止 (有意的或无意的)，为了适应这个，XPC 服务应该是尽可能的设计成 **响应式** 和 **无状态** 的。

> 对于沙盒程序而言，XPC 是实现权限分离的唯一办法。

## API

到目前为止，macOS 提供了两套 API 来允许我们实现 XPC: **XPC Service API** 以及 **NSXPCConnection API**。

### XPC Service API

XPC Services API 是基于 C 的 API，在 Mac OS X 10.7 Lion 开始被引入。它提供了客户端程序与服务端程序之间的基础的交流方法。

XPC Services API 主要有两个部分:

- `xpc.h`
- `connection.h`

xpc.h—APIs for creating and manipulating property list objects and APIs that daemons use to reply to messages.
Because this API is at the libSystem level, it cannot depend on Core Foundation. Also, not all CF types can be readily shared across process boundaries. XPC supports connection types such as file descriptors in its object graphs, which are not supported by CFPropertyList because it was designed as a persistent storage format, whereas XPC was designed as an IPC format. For these reasons, the XPC API uses its own container that supports only the primitives that are practical to transport across process boundaries.

Some higher-level types can be passed across an XPC connection, although they do not appear in the xpc.h header file (because referencing higher level frameworks from libSystem would be a layering violation). For example, the IOSurfaceCreateXPCObject and IOSurfaceLookupFromXPCObject functions allow you to pass an IOSurface object between the XPC service that does the drawing and the main application.

connection.h—APIs for connecting to an XPC service. This service is a special helper bundle embedded in your app bundle.
A connection is a virtual endpoint; it is independent of whether an actual instance of the service binary is running. The service binary is launched on demand.

A connection can also be sent as a piece of data in an XPC message. Thus, you can pass a connection through XPC to allow one service to communicate with another service (for example).

> TODO: Fill me.
{: .error }

### NSXPCConnection API

NSXPCConnection API 是基于 Objective - C 的 API，在 Mac OS X 10.8 Mountain Lion 开始被引入。它是对 C API 的一层封装，现已有 Swift 版 API。它提供了一种远程调用机制，允许客户端程序或者服务端程序通过代理对象调用另一端中与之对应的对象的方法。NSXPCConnection API 会自动将数据和对象序列化后传输到另一端，然后自动反序列化。这样的结果就是，调用远程对象的方法与调用本地对象的方法无异。

NSXPCConnection API 主要包括 4 个类:

- `NSXPCConnection`: 用于表示两个进程间双向交流的通道。
- `NSXPCInterface`: 用于描述连接的预期行为 (什么类可以被传输，什么对象和协议需要暴露出来等)。
- `NSXPCListener`: 用于监听传入的 XPC 连接。每个服务端至少有一个实现了 `NSXPCListenerDelegate` 代理的监听器。
- `NSXPCListenerEndpoint`: 用于唯一识别 `NSXPCListener` 对象的端点。可以通过 `NSXPCConection` 发送到其他进程中。借助端点可以在两个进程间发起匿名的直接连接。

![](/assets/img/19042301.svg)

上图展示了一个 app 到 XPC service 的单向连接。XPC service 使用 `NSXPCListener` 监听连接，当 app 构建 `NSXPCConnection` 对象发起与 XPC service 的连接时，XPC service 自动启动。随后，XPC service 中 `NSXPCListener` 对象的代理方法被调用，app 的 `NSXPCConnection` 对象被传递到 XPC service 中。在 `NSXPCListener` 的代理方法中，XPC service 设置 exported interface 与 exported object，前者是向外界公开的协议，后者是实现了这一协议的对象。app 从连接中获得 XPC service 中的 exported object 的远程代理。通过这个代理，app 可以远程调用 exported object 在 exported interface 中声明的方法。

XPC 是允许双向通讯的，在这种情况下，App 与 XPC Service 互相有一个对方的对象代理。

![](/assets/img/19042302.svg)

### 选用 API

如果你开发的是一个基于 Foundation 的 Cocoa 程序，那么，NSXPCConnection API 是你的不二之选。

如果需要兼容 Mac OS X 10.7 Lion，又或者需要对事件流进行操作 (如在某个 IOKit Events 发生时启动 XPC 服务)，那么，你应该选用 XPC Services API。

> 更多关于 XPC Services API 与事件流的信息，请参阅 `xpc_event(3)` 的 man page。
---
layout: post
series: Cocoa 速记
title: AppKit 中的窗口释放策略
tags: [swift, cocoa, macos, nswindow, nswindowcontroller]
lang: zh
---

在 Cocoa 开发中，窗口对象的释放策略也许并不如您预先中的一样。在本文中，我们可以稍微提一提这些不同情况下的释放策略。

## 通过 Storyboard Segue 打开的窗口

这类窗口指的是在 Storyboard 中通过 Segue 动作创建的窗口对象，在 Storyboard 中通过连线表示。如视图中的某个按钮动作是打开一个由窗口控制器控制的窗口，我们认为被打开的窗口属于该类型的窗口。

这类会在窗口关闭时被自动释放。但是，它们并不严格地遵循 ARC 来进行自动释放。

Segue 通过 Storyboard 创建并持有窗口控制器对象，随后它设置窗口控制器对象的私有属性 `retainedSelf` 为 `true`。这在窗口被关闭时，窗口控制器会将因 Segue 持有而增加的计数视作为自身持有自身，因为再无其他强引用，所以释放控制器对象。

> 您可以在 Xcode 中添加 Symbolic Breakpoint `-[NSWindowController _setRetainedSelf:]` 来进行调试。

## 通过 Storyboard Entry Point 打开的窗口

通过 Storyboard 初始控制器打开的窗口，它们的窗口控制器由程序对象持有。

与 Segue 打开的窗口不同，通过 Entry Point 打开的窗口的控制器并不会设置 `retainedSelf` 属性。因此，在这种窗口被关闭时，因为存在由程序对象持有而增加的计数，ARC 不会释放窗口以及窗口控制器。

由于 `NSApplication` 对象没有提供任何修改这一持有对象的方法，因此，我们断言，通过这种方法创建的窗口，除了随着程序对象的消亡而被释放以外，无法被手动释放。

## 通过纯代码创建由窗口控制器管理的窗口

我们对通过纯代码创建的窗口控制器拥有完全的控制权，这其中就包括了窗口对象与控制器对象的释放。

窗口对象的生命周期由其窗口控制器管理。窗口控制器持有窗口对象的强引用，且不能为 `nil`。也就是说，窗口对象是跟随窗口控制器对象的释放而释放的。

为了让窗口控制器可以被释放，我们首先要将窗口控制器改成可选性的变量：

```swift
var windowController: NSWindowController?
```

然后，我们可以监听 `NSWindow.willCloseNotification` 事件，或者在窗口对象的代理方法 `windowShouldClose(:)` 中，将 `windowController` 设置为 `nil`。

这样一来，在确保窗口控制器对象再无其他强引用以后，窗口和窗口控制器就可以在窗口被关闭时被释放了。

> 在使用监听或代理方法释放窗口控制器时，您应该确保监听该事件的对象或者代理对象不是需要被释放的窗口对象或窗口控制器对象本身。

## 通过纯代码创建的窗口

如果您是通过纯代码来创建一个没有控制器的窗口，与上一节类似，你可以使用同样的方法来释放该窗口对象：

使用可选性变量，监听 `NSWindow.willCloseNotification` 事件或者在窗口对象的代理方法 `windowShouldClose(:)` 中将窗口对象变量设置为 `nil`。

> 在使用监听或代理方法释放窗口时，您应该确保监听该事件的对象或者代理对象不是需要被释放的窗口对象本身。

## Sidenote: 关于 `isReleasedWhenClosed`

在 `isReleasedWhenClosed` 为 `true` 的场合下，`NSWindow` 并不遵循普通的内存管理策略。这使得 `isReleasedWhenClosed` 这一属性在使用 ARC 的现代 Cocoa 开发中变得特别尴尬。

当它释放时，它并没有非常干净的释放，而是留下了个空的 `NSMapTable`。也就是说，就算它释放了，它也不是 `nil`。

即使是从苹果自家的开发者邮箱列表中，你也只能找到将 `isReleaseWhenClosed` 设置为 `false` 的答复。并且在 `NSWindowController` 出现后，`isReleasedWhenClosed` 属性甚至被直接忽略。但是直到今日，`isReleaseWhenClosed` 仍然存在，没有过期。

就目前来说，我觉得 `isReleasedWhenClosed` 这个属性没有任何意义。

我的建议是：用 `NSWindowController` 来管理窗口，避免单独使用 `NSWindow`。如果你要单独使用 `NSWindow`，请务必将 `isReleasedWhenClosed` 属性设置为 `false`。
---
layout: post
series: Cocoa 速记
title: 懒加载视图或窗口控制器中的管理对象
tags: [cocoa, macos, swift, viewcontroller, windowcontroller]
---

当使用可视化创建视图控制器或者窗口控制器时，它们所管理的视图或窗口对象是懒加载的，直到真正使用到的时候，才会创建它们管理的对象。然而，当你需要使用纯代码时，却失去了这种行为。怎样才能在不使用可视化的前提下同样进行懒加载呢？

我们可以借助可视化的一些方法来实现懒加载效果。这没有在开发文档中被记载，但就我们的使用情况来说，这其实是挺好的一个方法。

这个方法有两个关键点:

- **重写 `loadWindow()` 或 `loadView()` 方法。** 虽然文档中说明了这两个方法在可视化中被用来从 storyboard 或 xib 中加载可视化对象，但我们可以重写这个方法，不从 storyboard 或 xib 中加载，而是直接创建一个对象给它们。
- **通过可视化的构造方法来创建控制器对象。** 这保证了控制器会在必要的时候调用 `laodWindow()` 或 `loadView()` 方法，从而实现懒加载。

也就是说，我们可以这样来重写一个窗口控制器：

```swift
class WindowController: NSWindowController {
    convenience init() {
        self.init(windowNibName: "")
    }

    override func loadWindow() {
        self.window = /* initilize window object */
    }
}
```

使用一个无参构造方法来调用 `init(windowNibName:)` 并传入一个任意字符串。我们并不需要用到这个 nibName，只是借助它触发 `loadWindow()` 方法而已。

而对于视图控制器，调用 `NSViewController` 的无参构造方法会触发它的可视化构造方法，因此，你甚至都不需要特地的去调用它:

```swift
class ViewController: NSViewController {
    override func loadView() {
        self.view = /* initilize view object */
    }
}
```

这样一来，我们可以做到只创建窗口控制器对象，而不创建窗口对象。直到需要用到窗口对象的时候，如调用了 `showWindow(_:)` 方法时，窗口控制器会去检查是否有窗口对象，并自动调用 `loadWindow()` 方法去加载它。

> 你可以编写一个 Demo，通过断点或调用栈，来查看的加载情况。

> 如果你想要通过视频来了解这一方法，[@LucasDerraugh](https://twitter.com/LucasDerraugh) 做了一期[视频教程](https://www.youtube.com/watch?v=vcyA4vTwZcQ)，值得一看。

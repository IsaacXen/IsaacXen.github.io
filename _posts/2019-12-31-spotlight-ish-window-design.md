---
layout: post
series: Cocoa 速记
title: Spotlight 式窗口设计
tags: [cocoa, macos, swift, spotlight, nspanel]
lang: zh
---

你可以在很多其他地方看到 Spotlight 式的设计，如意于取代 Spotlight 的功能更强大的 Alfred，又或是 Xcode 中的 Open Quickly 功能。这里我们就来讲一下这些 Spotlight 式窗口的实现。

> 本文只讲解 Spotlight 式窗口设计，并不会涉及到窗口内视图的变化，如显示隐藏列表，修改窗口大小等。虽说如此，文章的最后还是会稍微提供一下推荐的程序框架和键盘监听的思路。

## 使用 `NSPanel` 实现 Spotlight 式窗口

Spotlight 式窗口的关键在于创建一个不会成为焦点窗口的活动窗口 (non-main key window)。如果你打开了一个 Finder 窗口，然后激活了 Spotlight，你会发现，你的 Finder 窗口没有失去焦点，但是接收键盘事件的却是 Spotlight 窗口中的输入框。

![](/assets/img/4d5b0619-cf2e-40b5-b306-bdc65d204333.png)
*Spotlight 窗口接收键盘事件，而背后的 Finder 窗口并未失去焦点*

这是一个典型的面板窗口 ([Panels](https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/panels/)) 的使用场景。Panels 是一种[特殊的窗口](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/WinPanel/Concepts/UsingPanels.html#//apple_ref/doc/uid/20000224)，一般用于显示程序中的辅助功能。我们要实现的 Spotlight 式窗口很符合面板窗口的行为。

> 更多关于窗口不同状态的详情，请查看苹果官方的 [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/window-anatomy/#window-states) 。

面板窗口本身不能成为焦点窗口，所以我们只需要重写 `canBecomeKey` 属性，便可以创建一个可以成为活动窗口但不会成为焦点窗口的面板窗口类。

```swift
class KeyablePanel: NSPanel {
    // Allow panel to become key, that is, accepts keyboard event.
    override var canBecomeKey: Bool { true }
}
```

我们的 Spotlight 式窗口应该是无边框的非激活面板，它的窗口控制器如下所示：

```swift
class SpotlightishWindowController: NSWindowController {
    convenience init() {
        self.init(windowNibName: "")
    }
    
    override func loadWindow() {
        // Create a boderless, non-activating panel that float above other windows.
        window = KeyablePanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: true)
        window?.level = .floating
    }
}
```

> 这里使用了懒加载方式来实现窗口控制器，你可以查看 *[懒加载视图或窗口控制器中的管理对象]({% post_url 2019-10-27-lazy-loaded-view-or-window-controller-programmatically %})* 来详细了解这一用法。

实际上，到这一步，我们已经拥有了 Spotlight 式的窗口。给这个窗口设置视图以后，这个窗口看起来是这样的：

![](/assets/img/5c91532f-8ee3-41e6-a4c8-03b4315d93cf.png)

不得不说，这真的很丑。

一般来说，我们会给窗口加上模糊背景，圆角，阴影等效果，来让它看起来更加漂亮。如果你有一个特定的设计要实现，你可以像普通窗口一样来自定义它的外观了。这里列举一下我个人的实现方式：

```swift
class SpotlightishViewController: NSViewController {
    override func loadView() {
        // Use visual effect view to give window a blur effect.
        let visualEffectView = NSVisualEffectView(frame: NSMakeRect(0, 0, 360, 48))
        visualEffectView.state = .active
        visualEffectView.material = .menu
        visualEffectView.blendingMode = .behindWindow
        // Use mask image to rounds window corner.
        visualEffectView.maskImage = NSImage(size: NSMakeSize(16, 16), flipped: false, drawingHandler: {
            NSColor.black.setFill()
            let path = NSBezierPath(roundedRect: $0, xRadius: 8, yRadius: 8)
            path.fill()
            return true
        })
        visualEffectView.maskImage?.capInsets = NSEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        view = visualEffectView
    }
}
```

有趣的是，如果你窗口的根视图是一个 `NSVisualEffectView`，你可以直接在视图控制器中来实现窗口圆角，而无需再自定义窗口属性。

为了更好的展示效果，我们在视图层级中添加一个输入框，这样，我们的窗口看起来就会是下图的效果：

![](/assets/img/092921f5-86f1-42b0-af05-dac8b79e6af1.png)

## 窗口的显示与隐藏

一般来说，当需要显示 Spotlight 式窗口的时候，要么是我们的程序拥有焦点 (如 Xcode 的 OpenQuickly)，要么没有 (如 Spotlight)。不管是哪种情况，我们显示我们的 Spotlight 式窗口的时候，我们都不希望修改当前的焦点窗口。我们只需要简单的调用 `makeKeyAndOrderFront(_:)` 即可:

```swift
// Make key and order front without changing the main window.
spotlightWindowController.window?.makeKeyAndOrderFront(nil)
```

有些特殊情况下，`makeKeyAndOrderFront(_:)` 无法让我们的 Spotlight 式窗口成为活动窗口。这种时候，作为备用手段，我们可以激活我们的程序来成为焦点程序:

```swift
if !window.isKeyWindow {
    // Make our application active to force our window become main, do this only when `makeKeyAndOrderFront(_:)` failed.
    NSApplication.shared.activate(ignoringOtherApps: true)
}
```

每次在窗口显示出来后，我们都应该给窗口设置一个第一响应者，一般来说是等待输入的搜索框。我们可以在视图控制器的 `viewWillAppear` 方法中进行设置：

```swift
class SpotlightishViewController: NSViewController {
    // Allow view controller to accepts first responder status.
    override var acceptsFirstResponder: Bool { true }

    override func viewWillAppear() {
        // Make search field the first responder.
        view.window?.makeFirstResponder(searchField)
    }

    // ...
}
```

这样一来，我们就可以保证每次我们的 Spotlight 式窗口显示的时候，窗口中的搜索栏可以马上接收键盘事件。

隐藏窗口就更加简单了，直接调用 `close` 方法来隐藏窗口即可:

```swift
// Simply hide window using `close`.
spotlightWindowController.close()
```

此外，我们一般会想要在鼠标点击窗口外的其他地方时也将窗口隐藏。我们可以在窗口代理的 `windowDidResignKey(_:)` 中隐藏掉:

```swift
class SpotlightWindowController: NSWindowController, NSWindowDelegate {
    override func windowDidLoad() {
        window?.delegate = self
    }
    
    // Hide window when resign key.
    func windowDidResignKey(_ notification: Notification) {
        close()
    }
}
```

这样，每当窗口失去活动状态时，窗口会自动隐藏。

## 附加内容

### 典型程序设计

当我们的程序想要引入 Spotlight 式的窗口时，一般只有两种情况：一种是围绕着 Spotlight 式窗口进行开发的程序，另一种是将 Spotlight 式窗口作为附属功能的程序。

- 围绕着 Spotlight 式窗口进行开发，意味着程序的主要入口和交互手段就是这个 Spotlight 式窗口。它是全局的，能够在任何程序中呼出。典型代表是 macOS 自带的 Spotlight，以及 Alfred。在开发这类程序时，我们往往会将 Spotlight 式窗口放置在独立的后台驻留进程 (background agent) 中，通过在 `Info.plist` 中设置 `LSUIElement` 项来实现。而程序设置等其他程序内容，放置在另外的 target 中。你通过监听全局快捷键，或者使用菜单栏按钮来触发窗口的显示。对于进程间通讯，XPC 将会是你的好伙伴。

- 将 Spotlight 式窗口作为附属功能，意味着它仅仅是你程序中的一个附加的功能。这种设计下，我们往往不会使用 Spotlight 式窗口来作为某些的内容和操作的唯一入口，而是作为可以提高操作效率的一种使用方法。这种时候，你将它视作普通的附属窗口来进行设计即可。

### 键盘事件的监听与转发

在你的输入框监听特殊按钮的输入非常简单，只需要在设置输入框的代理对象以后使用 `NSTextFieldDelegate` 的 `control(_:textView:doCommandBy:)` 方法即可监听方向键与返回键的事件：

```swift
// Set the delegate of text field or search field.
textField.delegate = self
// Delegate method to use for special key.
func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
    switch commandSelector {
        case #selector(moveUp(_:)):
            print("pressed up")
        case #selector(moveDown(_:)):
            print("pressed down")
        case #selector(moveLeft(_:)):
            print("pressed left")
        case #selector(moveRight(_:)):
            print("pressed right")
        case #selector(cancelOperation(_:)):
            print("pressed esc")
        default: ()
    }
    // Return `false` to continue the default implementation, or `true` to override.
    return false
}

func controlTextDidChange(_ obj: Notification) {
    // Called when text field's text had changed.
}
```

在这之后，使用你偏好的方式来转发事件或者发送通知给相应的视图即可。
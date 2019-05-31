---
layout: post
series: Cocoa 速记
title: 修改标题栏高度的几种方法
tags: [cocoa, macos, swift, nswindow, appkit]
---

为了实现一些界面，我们经常会想要修改标题栏的高度 (确切的说是修改窗口控制按钮的位置)，来实现一些比较特殊的界面，如 Notes、Chrome、或者 QQ。

![](/assets/img/196C1FB2-4205-4921-846C-69C566DB5F4D.png)

## 借助一体式工具栏
从 Yosemite 开始，苹果允许我们将工具栏与标题栏整合在一起。它将标题栏高度从 22 点扩展到 38 点，还将控制按钮往右移动到 12 点的位置。更重要的是，你可以使用原生工具栏。

![](/assets/img/DC95601E-FFCE-4A8C-8935-99F1D0263669.png)

这应该是实现标题栏高度修改的最佳方法。当然缺点也很明显，标题栏的高度仍然是固定的，你没有办法将其修改为其他值。

你只需要为你的窗口添加一个工具栏，然后将窗口的标题隐藏掉即可:

```swift
window.titleVisibility = .hidden
```

> 即便你隐藏了窗口标题，你依旧应该为你的窗口设置一个合理的标题，因为你仍能在其他地方看到它。如 Dock、Mission Control、窗口菜单等。

你也可以在这基础上使用一个空的工具栏，并将标题栏的背景隐藏，这样可以让你实现新 Mac App Store 这样的窗口:

![](/assets/img/B3750B9D-3EB4-44DA-AE94-0C92CEE6D6BF.png)

```swift
window.titlebarAppearsTransparent = true       // transparent titlebar
window.toolbar?.showsBaselineSeparator = false // hide toolbar baseline separator
window.styleMask.insert(.fullSizeContentView)  // full size content view
```

## 手动修改视图
借助 AppKit 的一些方法，我们其实是可以获取到窗口控制按钮的对象和标题栏的。正因为如此，我们可以直接修改这些视图的 frame。这样做的对于一些需求比较特殊的用户界面比较有好处:

- **标题栏的高度, 按钮的位置可以完全自定义**。

但是缺点也很明显:

- **标题栏的可拖拽范围没有变化**。不管标题栏的高度怎么变，你能进行窗口拖拽的区域斌没有发生变化。我们仍然没能找到修改这个区域的比好的方法，但是我们的确有其他方法可以解决这一问题。
- **与工具栏的兼容性不佳**。你虽然可以修改标题栏的高度，但是我们仍然没有找到修改工具栏视图位置的方法。这意味着，即便你修改了标题栏的高度，工具栏仍然会显示在标题栏顶部，而非居中。
- **有些时候在界面上会有点小问题**。窗口在重新绘制时会覆盖的我们的修改，我们只能在某些关键事件的回调中重新进行修改。由于修改并不及时，我们会在一些时候看得一些小延后。如窗口从全屏模式退出时，在动画结束前，窗口按钮就消失不见。

### 编写修改方法

我们会在窗口控制器中进行修改。在窗口控制器中，添加名为 `updateWindowControls` 的方法:

```swift
func updateWindowControls() { }
```

这个方法主要需要做 2 件事:

- **修改标题栏高度**.
- **修改窗口控制按钮位置**.

修改标题栏高度是为了保证我们移动窗口控制按钮的时候不会被剪除。

首先我们需要获取标题栏的视图对象。

AppKit 在 `NSWindow` 中提供了 `standardWindowButton(_:)` 方法来允许我们获取某个指定的窗口控制按钮。窗口控制按钮很明显是放在标题栏里的，也就是标题栏的子视图。我们可以通过多次调用 `superview` 属性来获取父视图，也就是标题栏的视图对象:

```swift
guard let window = window else { return }
let titlebar = window.standardWindowButton(.closeButton)?.superview?.superview
```
 
得到了标题栏的视图对象，剩下来的就是就该它的 frame 了。首先我们修改标题栏的高度，这里的 `barHeight` 是标题栏的新高度。然后我们需要将标题栏往下移动。这是因为在 macOS 平台，视图座标的原点是在左下角的，修改高度会让它往上延申，而这恰好被窗口边界挡住，最后我们会看不出任何效果:

```swift
titlebar.frame.size.height = barHeight
titlebar.frame.origin.y = window.frame.size.height - barHeight
```

有了新的标题栏高度，我们可以修改窗口控制按钮来在其在标题栏中垂直居中。

```swift
let buttons = [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton].compactMap {
  window.standardWindowButton($0)
}

for button in buttons {
  button.frame.origin.y = (barHeight - button.frame.height) / 2
}
```

其实到这里，我们的修改就结束了。但是为了视觉美观起见，我们会将窗口控制按钮稍微往右移一点，来给按钮更多的呼吸空间，就像系统实现一体式工具栏时那样。

默认情况下，关闭按钮距离窗口左边界的距离是 7 点，而在启用一体式工具栏时是 12 点。我们可以做一些小计算，让控制按钮根据垂直方向上与标题栏的间隙让它离左边界的距离在 7 到 12 点之间浮动。

```swift
let buttonHeight = window.standardWindowButton(.closeButton)?.frame.height ?? 16 // height of button
let offset = (barHeight - buttonHeight) / 2 // padding between titlebar and button
var x: CGFloat = max(7, min(offset + 4, 12)) // new x that clipped in range 7...12
```

然后在遍历按钮的时候一同修改一下水平方向上的位移即可:

```swift
for button in buttons {
  button.frame.origin.x = x
  x += button.frame.width + 6
}
```

最后，有一个小问题需要解决，那就是按钮的 tracking area。我们修改了按钮的位置，但是，用来实现 mouse hover 效果的 tracking area 还没有改变。

这个 tracking area 存放在 theme frame (也就是 titlebar 的父视图) 的 `trackingAreas` 里，并且，它是在数组内唯一一个包含 `NSTrackingArea.Options.activeAlways` 的元素。 所以，我们可以获取到这个 tracking area，移除它，然后添加一个新的 tracking area:

```swift
if let trackingArea = titlebar.superview?.trackingAreas.first(where: {
    $0.options.contains(.activeAlways)
}) {
    let rect = buttons.reduce(NSZeroRect, { $0.union($1.frame) })
    let newTrackingArea = NSTrackingArea(rect: rect, options: trackingArea.options, owner: trackingArea.owner, userInfo: trackingArea.userInfo)
    
    titlebar.superview?.removeTrackingArea(trackingArea)
    titlebar.superview?.addTrackingArea(newTrackingArea)
}
```

> 你也可以通过调用
> ```swift
> titlebar.superview?.viewDidEndLiveResize()
> ```
> 来让间接让系统更新 tracking area。

现在，对上面的代码稍做修改整合，你现在应该有一个这样的 `updateWindowControls` 方法:

```swift
var titlebarHeight: CGFloat? {
    didSet { updateWindowControls() }
}

func updateWindowControls() {
  guard
    let window = window,
    let titlebar = window.standardWindowButton(.closeButton)?.superview?.superview,
    let barHeight = titlebarHeight
  else { return }

  titlebar.frame.size.height = barHeight
  titlebar.frame.origin.y = window.frame.size.height - barHeight

  let buttonHeight = window.standardWindowButton(.closeButton)?.frame.height ?? 16
  let offset = (barHeight - buttonHeight) / 2
  var x: CGFloat = max(7, min(offset + 4, 12))

  let buttons = [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton].compactMap {
    window.standardWindowButton($0)
  }

  for button in buttons {
    button.frame.origin.y = (barHeight - button.frame.height) / 2
    button.frame.origin.x = x
    x += button.frame.width + 6
  }

  if let trackingArea = titlebar.superview?.trackingAreas.first(where: {
    $0.options.contains(.activeAlways)
  }) {
    let rect = buttons.reduce(NSZeroRect, { $0.union($1.frame) })
    let newTrackingArea = NSTrackingArea(rect: rect, options: trackingArea.options, owner: trackingArea.owner, userInfo: trackingArea.userInfo)
    
    titlebar.superview?.removeTrackingArea(trackingArea)
    titlebar.superview?.addTrackingArea(newTrackingArea)
  }
}
```

> 我们将 `titlebarHeight` 设置成了可选型，是为了在我不想修改标题栏高度的时候，可以将它设置为 `nil`，这样就可以避免让它执行没有意义的运算。

### 调用修改方法

好了，我们有了修改的方法，现在的问题就是在什么时候调用它。窗口在重新绘制时会覆盖的我们的修改，将标题栏和控制按钮放置到它原来的位置。我们必须在某些关键事件的回调中重新进行修改。

基本上，我们基本上只需要在这些 `NSWindowDelegate` 回调中进行调用:

- `windowDidResize(_:)`: 窗口在拉伸时会重写进行绘制，在这里调用再适合不过了。
- `windowDidExitFullScreen(_:)`: 当窗口退出全屏模式时调用。`windowWillExitFullScreen(_:)` 调用太早，在那里修改仍然会被系统覆盖。这里是目前最合适的地方了。最理想的地方是构建退出动画的时候，这里可以很好的解决在动画时控制按钮没有显示出来的问题。不过，重写退出动画将会极大的增加我们的工作量。

```swift
class WindowController: NSWindowController, NSWindowDelegate {
  override func windowDidLoad() {
    window?.delegate = self
  }

  func windowDidExitFullScreen(_ notification: Notification) {
    updateWindowControlsPosition()
  }

  func windowDidResize(_ notification: Notification) {
    updateWindowControlsPosition()
  }
}
```

我们没有必要在 `windowDidLoad` 中调用，这时窗口还未出现在屏幕上。而且，当窗口出现时，`windowDidResize(_:)` 会被调用，我们可以放心的跳过 `windowDidLoad`。

我们也没有必要在 `windowDidEnterFullScreen(_:)` 中调用。进入全屏时，标题栏会自动隐藏。这恰好是我们所期望的事情。不过，你的确有必要在窗口进入或退出全屏模式的时候调整你的界面，来适应窗口控制按钮的隐藏时腾出的空间。

### 小结

不出意料的话，你应该可以看到如下图这样的窗口。

![](/assets/img/44525A3D-7EAB-4E22-9EF1-26F6136D9515.png)

这里将标题栏背景显示出来，只是为了更加方便的演示。在实际情况中，你几乎永远都会将它隐藏，并配合 `.fullSizeContentView` style mask 来添加你自己的假标题栏。你也可以直接抛弃假标题栏，充分利用这一空间来显示你的应用内容。

```swift
window.titlebarAppearsTransparent = true      // transparent titlebar
window.titleVisibility = .hidden              // hide window title
window.styleMask.insert(.fullSizeContentView) // full size content view
```

此外，为了解决标题栏推拽区域的问题，这里有几种比较好的方法:

- 将窗口的 `isMovableByWindowBackground` 属性设置为 `true`。
- 提供重写了 `mouseDownCanMoveWindow` 属性的自定义视图。
- 提供重写了 `mouseDown(with:)` 并调用窗口的 `performDrag(with:)` 方法的自定义视图。

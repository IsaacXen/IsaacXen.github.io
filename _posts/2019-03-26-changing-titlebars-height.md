---
layout: post
series: Cocoa 速记
title: 修改标题栏高度
tags: [cocoa, macos, swift, nswindow, appkit]
lang: zh
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

借助 AppKit 的一些方法，我们其实是可以获取到窗口控制按钮的对象和标题栏的。正因为如此，我们可以直接修改这些视图的 frame。这样做的对于一些需求比较特殊的用户界面比较有好处，因为标题栏的高度以及按钮的位置可以完全自定义。

主要来说，我们需要在窗口控制器中做 3 件事：

- **修改标题栏高度**
- **修改窗口控制按钮位置**
- **更新按钮的追踪区域**

### 修改标题栏高度

我们编写一个 `_updateTitlebarConstraints(with:)` 方法来执行标题栏高度的修改：

```swift
private func _updateTitlebarConstraints(with notification: Notification?) { /* ... */ }
```

首先我们需要获取标题栏的视图对象。AppKit 在 `NSWindow` 中提供了 `standardWindowButton(_:)` 方法来允许我们获取某个指定的窗口控制按钮。窗口控制按钮很明显是放在标题栏里的，也就是标题栏的子视图。我们可以通过多次调用 `superview` 属性来获取父视图，也就是标题栏的视图对象:

```swift
let titlebar = window.standardWindowButton(.closeButton)?.superview?.superview
let titlebarContainer = titlebar.superview
```

现在我们可以使用自动布局来修改它的高度了。使用自动布局的原因是它可以避免在系统样式发生变化的时候，我们修改过的标题栏布局被系统布局所覆盖，如切换黑暗模式，或者进入退出全屏幕。

由于窗口在进出全屏幕模式时，窗口标题栏的视图层级会发生变化，因此，我们需要创建两组约束，并在合适的时候启用或禁用它们：

```swift
private var _regularConstraints: [NSLayoutConstraint] = []
private var _fullScreenConstraints: [NSLayoutConstraint] = []
```

`_regularConstraints` 数组用来存放普通模式下标题栏的约束，而 `_fullScreenConstraints` 数组用来存放全屏模式下标题栏的约束。

对于普通情况下的约束，我们需要在即将进入全屏时禁用掉，并且在已经退出全屏后将其重新启用；而对于全屏模式下的约束，我们需要在已经进入全屏时启用它，在即将退出全屏时将其禁用。此外，在窗口一开始显示时候，我们就要激活普通情况下的约束。

下面是普通情况下的标题栏约束:

```swift
titlebar.leadingAnchor.constraint(equalTo: titlebarContainer.leadingAnchor),
titlebar.trailingAnchor.constraint(equalTo: titlebarContainer.trailingAnchor),
titlebar.topAnchor.constraint(equalTo: titlebarContainer.topAnchor),
titlebar.heightAnchor.constraint(equalToConstant: 52).with(priority: .defaultLow)
```

在这里，我们通过 height anchor 指定了标题栏的高度，同时，我们将该约束设置为低优先级。这可以避免在进入全屏时发生约束冲突造成烦人的报错。

而在全屏模式下:

```swift
titlebar.leadingAnchor.constraint(equalTo: titlebarContainer.leadingAnchor),
titlebar.trailingAnchor.constraint(equalTo: titlebarContainer.trailingAnchor),
titlebar.topAnchor.constraint(equalTo: titlebarContainer.topAnchor),
titlebar.heightAnchor.constraint(equalToConstant: 22)
```

我们强制将标题栏的高度设置为 22，这是标准情况下窗口标题栏的高度。

对上面的代码稍加整理，你现在应该有一个这样的方法：

```swift
private var _regularConstraints: [NSLayoutConstraint] = []
private var _fullScreenConstraints: [NSLayoutConstraint] = []

private func _updateTitlebarConstraints(with notification: Notification) {
  guard
    let window = window,
    let titlebar = window.standardWindowButton(.closeButton)?.superview?.superview,
    let titlebarContainer = titlebar.superview
  else { return }
  
  titlebar.translatesAutoresizingMaskIntoConstraints = false
  
  switch notification.name {
    case NSWindow.willEnterFullScreenNotification:
      NSLayoutConstraint.deactivate(_regularConstraints)
      
    case NSWindow.didEnterFullScreenNotification:
      if _fullScreenConstraints.isEmpty {
        _fullScreenConstraints = [
          titlebar.leadingAnchor.constraint(equalTo: titlebarContainer.leadingAnchor),
          titlebar.trailingAnchor.constraint(equalTo: titlebarContainer.trailingAnchor),
          titlebar.topAnchor.constraint(equalTo: titlebarContainer.topAnchor),
          titlebar.heightAnchor.constraint(equalToConstant: 22)
        ]
      }
          
      NSLayoutConstraint.activate(_fullScreenConstraints)
      
    case NSWindow.willExitFullScreenNotification:
      NSLayoutConstraint.deactivate(_fullScreenConstraints)
      
    case NSWindow.didExitFullScreenNotification:
      fallthrough
      
    default:
      if _regularConstraints.isEmpty {
        _regularConstraints = [
          titlebar.leadingAnchor.constraint(equalTo: titlebarContainer.leadingAnchor),
          titlebar.trailingAnchor.constraint(equalTo: titlebarContainer.trailingAnchor),
          titlebar.topAnchor.constraint(equalTo: titlebarContainer.topAnchor),
          titlebar.heightAnchor.constraint(equalToConstant: 52).with(priority: .defaultLow)
        ]
      }
          
      NSLayoutConstraint.activate(_regularConstraints)
  }
}
```

现在我们只需要在合适的地方调用它们：

```swift
func windowWillEnterFullScreen(_ notification: Notification) {
  _updateTitlebarConstraints(with: notification)
}
    
func windowDidEnterFullScreen(_ notification: Notification) {
  _updateTitlebarConstraints(with: notification)
}
    
func windowWillExitFullScreen(_ notification: Notification) {
  _updateTitlebarConstraints(with: notification)
}
    
func windowDidExitFullScreen(_ notification: Notification) {
  _updateTitlebarConstraints(with: notification)
}

func windowDidResize(_ notification: Notification) {
  _updateTitlebarConstraints(with: notification)
}
```

这样，标题栏的高度就完成修改了。接下来，我们来添加标题栏中按钮的约束。

### 修改窗口控制按钮位置

我们同样编写一个方法：

```swift
private func _updateButtonGroupConstraints() { /* ... */ }
```

对于按钮，我们除了希望按钮间的间距为默认的 6 点，我们还希望它们永远垂直居中与标题栏中，并且距离窗口边缘有一定的距离：

```swift
closeButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
miniaturizeButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
zoomButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
closeButton.leadingAnchor.constraint(equalTo: titlebar.leadingAnchor, constant: 7)
miniaturizeButton.leadingAnchor.constraint(equalTo: closeButton.trailingAnchor, constant: 6),
zoomButton.leadingAnchor.constraint(equalTo: miniaturizeButton.trailingAnchor, constant: 6),
```

在这个基础上，我们还可以做到更多。为了视觉美观起见，我们可以将窗口控制按钮稍微往右移一点，来给按钮更多的呼吸空间，就像系统实现一体式工具栏时那样。

默认情况下，关闭按钮距离窗口左边界的距离是 7 点，而在启用一体式工具栏时是 12 点。我们可以做一些小计算，让控制按钮根据垂直方向上与标题栏边缘的距离来让它离左边界的距离在 7 到 12 点之间浮动。

```swift
let barHeight = window.styleMask.contains(.fullScreen) ? 22 : titlebarHeight
let verticalSpacing = (barHeight - closeButton.frame.height) / 2
let leadingOffset = max(7, min(verticalSpacing + 4, 12))
```

然后修改关闭按钮的 leading anchor 约束的定值即可。

这样下来，你应该会有一个这样的方法：

```swift
private var _buttonsConstraints: [NSLayoutConstraint] = []
private var _buttonGroupLeadingConstraint: NSLayoutConstraint?

private func _updateButtonGroupConstraints() {
  guard
    let window = window,
    let titlebar = window.standardWindowButton(.closeButton)?.superview,
    let titlebarContainer = titlebar.superview,
    let closeButton = window.standardWindowButton(.closeButton),
    let miniaturizeButton = window.standardWindowButton(.miniaturizeButton),
    let zoomButton = window.standardWindowButton(.zoomButton)
  else { return }
        
  // calculate leading spacing for button group
  let barHeight = window.styleMask.contains(.fullScreen) ? 22 : titlebarHeight
  let verticalSpacing = (barHeight - closeButton.frame.height) / 2
  let leadingOffset = max(7, min(verticalSpacing + 4, 12))
  
  let buttons = [closeButton, miniaturizeButton, zoomButton]
  
  // create constraints if needed
  if _buttonsConstraints.isEmpty {
    buttons.forEach { $0.translatesAutoresizingMaskIntoConstraints = false }
    
    _buttonGroupLeadingConstraint = closeButton.leadingAnchor.constraint(equalTo: titlebar.leadingAnchor, constant: leadingOffset)
    
    _buttonsConstraints = [
      closeButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
      miniaturizeButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
      zoomButton.centerYAnchor.constraint(equalTo: titlebar.centerYAnchor),
      _buttonGroupLeadingConstraint!,
      miniaturizeButton.leadingAnchor.constraint(equalTo: closeButton.trailingAnchor, constant: 6),
      zoomButton.leadingAnchor.constraint(equalTo: miniaturizeButton.trailingAnchor, constant: 6)
    ]
    
    // activate constraints
    NSLayoutConstraint.activate(_buttonsConstraints)
  }
  
  // update leading constant
  _buttonGroupLeadingConstraint?.constant = leadingOffset
  titlebarContainer.layoutSubtreeIfNeeded()
}
```

我们需要在下面这些代理方法中调用:

```swift  
func windowDidEnterFullScreen(_ notification: Notification) {
  // ...
  _updateButtonGroupConstraints()
}
    
func windowDidExitFullScreen(_ notification: Notification) {
  // ...
  _updateButtonGroupConstraints()
}

func windowDidResize(_ notification: Notification) {
  // ...
  _updateButtonGroupConstraints()
}
```

### 更新按钮的追踪区域

最后，有一个小问题需要解决，那就是按钮的追踪区域。我们修改了按钮的位置，但是，用来实现鼠标悬浮效果的追踪区域还没有改变。

这个最终区域存放在 theme frame (也就是 titlebar 的父视图) 的 `trackingAreas` 里，并且，它是在数组内唯一一个包含 `NSTrackingArea.Options.activeAlways` 的元素。 所以，我们可以获取到这个追踪区域，移除它，然后添加一个新的追踪区域。我们同样编写一个方法：

```swift
private func _updateButtonGroupTrackingArea(buttons: [NSView]) {
  let themeView = buttons.first?.superview?.superview?.superview
  
  if let trackingArea = themeView?.trackingAreas.first(where: { $0.options.contains(.activeAlways) }) {
    // create a new tracking area with latest tracking rect
    let trackingRect = buttons.reduce(NSZeroRect, { $0.union($1.frame) })
    let newTrackingArea = NSTrackingArea(rect: trackingRect, options: trackingArea.options, owner: trackingArea.owner, userInfo: trackingArea.userInfo)
    // replace the tracking area
    themeView?.removeTrackingArea(trackingArea)
    themeView?.addTrackingArea(newTrackingArea)
  }
}
```

> 你也可以通过调用
> ```swift
> titlebar.superview?.viewDidEndLiveResize()
> ```
> 来让间接让系统更新 tracking area。

每当我们修改了按钮的位置，我们就更新追踪区域，也就是说，我们在 `_updateButtonGroupConstraints` 方法的最后调用该方法即可:

```swift
private func _updateButtonGroupConstraints() {
  // ...
  _updateButtonGroupTrackingArea(buttons: buttons)
}
```

## 小结

不出意料的话，你应该可以看到如下图这样的窗口，并且，它能够很好的兼容全屏模式与黑暗模式的切换。

![](/assets/img/44525A3D-7EAB-4E22-9EF1-26F6136D9515.png)

需要注意的是，但你使用第二种方法来自定义窗口标题高度时:

- **标题栏的可拖拽范围没有变化**。不管标题栏的高度怎么变，你能进行窗口拖拽的区域没有发生变化。我们仍然没能找到修改这个区域的比好的方法，但是我们的确有其他方法可以解决这一问题：
  - 将窗口的 `isMovableByWindowBackground` 属性设置为 `true`。
  - 提供重写了 `mouseDownCanMoveWindow` 属性的自定义视图。
  - 提供重写了 `mouseDown(with:)` 并调用窗口的 `performDrag(with:)` 方法的自定义视图。
- **与工具栏的兼容性不佳**。你虽然可以修改标题栏的高度，但是我们仍然没有找到修改工具栏视图位置的方法。这意味着，即便你修改了标题栏的高度，工具栏仍然会显示在标题栏顶部，而非居中。

> 这里将标题栏背景显示出来，只是为了更加方便的演示。在实际情况中，你几乎永远都会将它隐藏，并配合 `.fullSizeContentView` style mask 来添加你自己的假标题栏。你也可以直接抛弃假标题栏，充分利用这一空间来显示你的应用内容。

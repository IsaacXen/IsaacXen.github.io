---
layout: post
series: Cocoa 速记
title: 制作一个照片预览视图
tags: [cocoa, macos, nsscrollview, nsclipview, swift]
lang: zh
---

照片预览视图是挺常见的视图，在即时通讯、媒体查看器、文档编辑器等带有照片预览功能的程序中都能看到照片预览视图的身影。本文将讲解一些制作照片预览视图时会遇到的核心技术。

## 了解滑动视图的原理

在开始之前，我想简略的说说滑动视图的原理，从而让我们有一个共同的出发点。

首先，在滑动视图里，真正实现滑动跟缩放功能的是它的一个 `NSClipView` 子视图，我们可以把它叫做裁剪视图。而被滑动或缩放的视图，是裁剪视图下的 `NSView` 子视图，我们姑且把它叫做文件视图。

```
Scroll view
+ Clip view             <- View that actually provide scroll services.
  + Documnet view       <- View that scroll view provide scrolling services to.
```

想要搞懂裁剪视图怎么实现滑动的，我们只需要搞懂视图的 **框架 (frame)** 与 **界限 (bounds)** 这两个概念。

**框架** 定义的是视图在其父视图坐标系统内的一个矩形的位置与大小，而 **界限** 是视图在它自己的坐标系统中的位置与大小。改变视图的框架带来的是它在父视图坐标系中的位置和大小的变化，而改变视图的界限带来的是该视图绘制的自身坐标系的区域变化。

听起来有抽象，我们可以用一个现实的比喻来更好理解这一理念。

我们将视图视作摄像机跟监视器的组合，那么，摄像机捕获到的画面就是视图的界限。摄像机的平移、拉近拉远，带来最直观的变化就是捕捉到的画面位置以及画面远近的变化。而连接到摄像机的外部监视器 (框架) 是不会随着摄像机的移动而移动的，改变的只是它显示的内容。监视器的位置只取决于现实中你怎么摆放它，跟摄像机的移动毫无关系。

<video autoplay muted loop>
  <source src="/assets/mov/fb639c2b-e6ae-4f95-a26b-a9bc5a9a2253.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

> 如果你需要用一种比较官方的语言来理解它们，请查阅 [视图编程指南](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CocoaViewsGuide/Coordinates/Coordinates.html#//apple_ref/doc/uid/TP40002978-CH10-SW9) 以及 `NSView` 中 [`frame`](https://developer.apple.com/documentation/appkit/nsview/1483713-frame) 与 [`bounds`](https://developer.apple.com/documentation/appkit/nsview/1483817-bounds) 的开发文档。
{: .info }

了解视图的框架与界限以后，你其实就理解裁剪视图中的滑动跟缩放是怎么个回事了：通过监听来自鼠标滑轮、触摸板等设备的事件来修改裁剪视图的界限，从而实现滑动与缩放。再用一个视图作为容器将裁剪视图、文件视图以及我们没有提及到的滚动条、标尺封装成我们所熟知的 `NSScrollView` 滑动视图。

> 如果你想对滑动视图有一个系统的了解，可以查阅 [Cocoa 滑动视图编程指南](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/NSScrollViewGuide/Articles/Introduction.html#//apple_ref/doc/uid/TP40003460-SW1)。此外，更多关于手势滑动与缩放的知识，可以观看 [优化 OS X 绘制与滑动](https://developer.apple.com/videos/play/wwdc2013/215)。
{: .info }

有了对滑动视图的大致理解，我们可以开始制作我们的照片预览视图了。在下文，我们将使用一个纯色视图充当文件视图为例子来进行讲解：

```swift
class MyDocumentView: NSView {
    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        layer?.backgroundColor = NSColor.blue.cgColor
    }
}
```

在实际上，你可以使用任何你想要的视图。唯一的要求是该视图应该有一个明确的尺寸，不管是视图自身提供的，还是你后期赋予它的。

文章会略过项目的创建、添加视图，设置工具栏等步骤，这些并不是文章的重点。

## 在裁剪视图里居中文件视图

在默认情况下，文件视图在裁剪视图内是紧靠左下角放置的（也就是视图原点）。在进行缩放时，裁剪视图的 `constrainBoundsRect(_:)` 方法会被不断调用，用来将文件视图限制在裁剪视图的视野中：

<video autoplay muted loop>
  <source src="/assets/mov/7aa64e00-c3a1-4142-a185-f910e8744f0d.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

知道了这个以后，居中的方法也很明朗了：我们可以重写裁剪视图的 `constrainBoundsRect(_:)` 方法，在它原方法的基础上，将结果进行位移，使得文件视图在裁剪视图中居中显示。

我们还可以做更多，当文件视图大于裁剪视图的时候，如果滑动到文件视图边缘，我们也想避免文件视图与裁剪视图的边界之间留空（也就是避免过度滑动）。

下面是我们重写的 `constrainBoundsRect(_:)` 方法：

```swift
override func constrainBoundsRect(_ proposedBounds: NSRect) -> NSRect {
    var clipBounds = super.constrainBoundsRect(proposedBounds)
            
    // ➊ Process only when document view exist, and has a valid size.
    guard let documentView = documentView, documentView.frame.width > 0 && documentView.frame.height > 0 else {
        return clipBounds
    }
    
    // ➋ Calculate the scaled content insets.
    let scaleFactor = bounds.width > 0 ? (clipBounds.width / bounds.width) : 1
    var insets = contentInsets.forEach { $0 * scaleFactor }
    
    // ➌ Swap insets on y asix, if the view geometry is flipped.
    if isFlipped { (insets.top, insets.bottom) = (insets.bottom, insets.top) }

    // ➍ Calculate the document view's frame, outseted by the scaled content insets.
    let x = documentView.frame.minX - insets.left
    let y = documentView.frame.minY - insets.bottom
    let w = documentView.frame.width + insets.left + insets.right
    let h = documentView.frame.height + insets.top + insets.bottom
    let documentFrame = NSMakeRect(x, y, w, h)
    
    // ➎ If the clip bounds width is larger that the document, center the bounds around the document.
    // Otherwise, make sure that the clip rect stays within the document frame.
    if clipBounds.width > documentFrame.width {
        clipBounds.origin.x = documentFrame.minX - (clipBounds.width - documentFrame.width) / 2
    } else if clipBounds.width < documentFrame.width {
        clipBounds.origin.x = max(documentFrame.minX, min(clipBounds.origin.x, documentFrame.maxX - clipBounds.width))
    }
    
    if clipBounds.height > documentFrame.height {
        clipBounds.origin.y = documentFrame.minY - (clipBounds.height - documentFrame.height) / 2
    } else if clipBounds.height < documentFrame.height {
        clipBounds.origin.y = max(documentFrame.minY, min(clipBounds.origin.y, documentFrame.maxY - clipBounds.height))
    }

    // ➏ Return the backing store pixel-aligned rectangle in local view coordinates.
    return backingAlignedRect(clipBounds, options: .alignAllEdgesNearest)
}
```

➊ 我们只在文件视图存在，且拥有有效尺寸时才继续。<br/>
➋ 计算缩放后的内填充。这里的 `forEach` 表示将 `contentInsets` 中的 `top`, `left`, `bottom`, `right` 分别进行某种计算。在上面的例子中是共同乘以 `scaleFactor`。<br/>
➌ 根据 `isFlipped` 属性翻转 Y 轴上的内填充量。<br/>
➍ 计算应用内填充后的文件视图的位置与尺寸。<br/>
➎ 根据需要修改裁剪视图的界限。在文件视图的框架小于裁剪视图的界限时，添加位移来使文件视图位于裁剪视图界限的中心。而在文件视图的框架大于裁剪视图的界限时，将裁剪视图的界限限制在文件视图的框架内部。纵横两个方向分开执行。<br/>
➏ 最后返回一个像素对齐的矩形。

这样，我们的文件视图就能够居中于裁剪视图了：

<video autoplay muted loop>
  <source src="/assets/mov/349677d7-2cc4-4170-aab7-2b50272b1d67.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## 修复初滑动的跳动问题

在我们重写了裁剪视图的 `constrainBoundsRect(_:)` 方法后，我们的滑动会出现一点问题。

在向上或向左滑动的时候，视图的位置会在一开始出现明显的跳动，而非平滑过度。这看似好像是滑动事件的前几个事件没有调用裁剪视图的 `scroll(to:)` 方法：

<video autoplay muted loop>
  <source src="/assets/mov/2f52564a-b911-42c4-b2e4-6eb6a4290ff5.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

有意思的是，这个问题可以通过一种近乎奇妙的方法来修复：重写裁剪视图的 `scrollWheel(with:)` 方法，并只调用它的 `super` 方法。

```swift
// A weird fix to the scrolling glitch.
// These three lines make no sence, but I have no idea why this work.
override func scrollWhell(with event: NSEvent) {
    super.scrollWheel(with: event)
}
```

你可能跟我想的一样，重写一个方法却只调用它的 `super` 方法跟不重写没有什么区别。但这看似无用的三行代码却能让滑动变得顺滑起来：

<video autoplay muted loop>
  <source src="/assets/mov/f5dcd805-097d-44b2-82fd-81773fcd52c5.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

希望这个问题能在未来的 macOS 版本中得到修复。

## 放大、缩小与自适应缩放

现在我们可以实现具体的放大、缩小功能了。因为滑动视图本身已经做好了手势缩放，所以我们这里特指的是通过按钮触发的放大、缩小。

在滑动视图中，比较重要的与缩放相关的属性有下面这些：

- `allowsMagnification`: 是否启用缩放功能。
- `magnification`: 当前的缩放比。
- `minMagnification`: 最小缩放比。
- `maxMagnification`: 最大缩放比。

此外也提供了像 `setMagnification(_:centeredAt:)` 的方法来让我们设定缩放比。该方法同时也可以通过动画代理来动态改动。我们可以编写一个方便的方法：

```swift
private func setMagnification(_ magnification: CGFloat, animated: Bool) {
    // Center point of clip view. Since this function is only called by button, menu item 
    // or keyboard action, we don't need to consider the mouse location.
    let center = NSPoint(x: scrollView.contentView.frame.minX, y: scrollView.contentView.frame.minY)

    if animated {
        scrollView.animator().setmagnification(magnification, centeredAt: center)
    } else {
        scrollView.setmagnification(magnification, centeredAt: center)
    }
}
```

在往下的代码中，我们会直接调用这个方法来方便的进行缩放。

我们事先设定一组缩放比，每次触发放大、缩小时，就缩放到这些预设的缩放比去。下面列举的是与自带 Preview 对应的一组缩放比：

```swift
let zoomScales: [CGFloat] = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20, 30]
```

除了这些缩放比以外，还有一个需要我们动态计算的缩放比，就是 **自适应缩放比**。它指的是在当前环境下，刚好能够使裁剪视图显示整个文件视图而不被裁剪的缩放比。

Preview 中也会将该缩放比添加到预设的缩放比集合里。这样，在通过按钮缩放照片时，它可以将照片在不被遮挡的前提下尽可能的填满整个窗口。

此外，在 Preview 中，如果当前缩放比是自适应缩放比时，那么在改变 Preview 窗口大小的时候，该缩放比也会动态变化，从而使得照片一直填满窗口。

我们用一个 `fitScale` 变量来存储这个缩放比。同时编写一个 `currentFitScale()` 方法来计算最适合当前环境的自适应缩放比：

```swift
/// The scale ratio that can fit the document view.
private(set) var fitScale: CGFloat = 1

/// Calculate the magnification that fit the document view into the clip view.
func currentFitScale() -> CGFloat {
    guard let documentView = scrollView.documentView else { return 1 }
    
    // Get the width & height ratio of document view and clip view.
    let documentRatio = documentView.bounds.width / documentView.bounds.height
    let     clipRatio = clipView.bounds.width / clipView.bounds.height
    
    // Compare to see which asix is critical to fit the document view.
    // Return the scale of that asix.
    if documentRatio < clipRatio {
        return clipView.frame.height / documentView.bounds.height
    } else {
        return clipView.frame.width / documentView.bounds.width
    }
}
```

这里将 `fitScale` 的存放与计算分开，而不直接使用计算属性 (computed property) 是因为我们在后面会遇到需要用到先前的最佳缩放比的情况。

我们的 `zoomIn` 放大方法要做的事情很简单，找到比当前缩放比大一档的缩放比，然后调用 `setMagnification(_:animated:)` 即可：

```swift
func zoomIn() {
    // Update fit scale.
    fitScale = currentFitScale()
    
    // Combine default zoom scales and the fit scale.
    let availableZoomScales = zoomScales + [fitScale]

    // Find the smallest zoom scale in the array that grather than the current zoom scale.
    // And apply that scale with animation.
    if let zoomScale = availableZoomScales.filter({ $0 > scrollView.magnification }).min() {
        setMagnification(zoomScale, animated: true)
    }
}
```

类似的，我们可以编写 `zoomOut()` 方法。只需稍微改动在数组中寻找下一个缩放比的代码即可：

```swift
let zoomScale = availableZoomScales.filter({ $0 < scrollView.magnification }).max()
```

<video autoplay muted loop>
  <source src="/assets/mov/144af05e-f83f-432f-b1c6-591fa964c7ca.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

而缩放到原比例，只需要在调用 `setMagnification(_:animated:)` 时传入 `1` 即可。

下面我们来实现缩放至自适应的功能。有了上面的基础，我们只需要在调用 `setMagnification(_:animated)` 时传入我们的 `fitScale` 即可：

```swift
func zoomToFit() {
    fitScale = currentFitScale()
    setMagnification(fitScale, animated: true)
}
```

<video autoplay muted loop>
  <source src="/assets/mov/9865807d-82c8-46f3-ba72-678d5ffca8d8.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

不过怎么去响应窗口的大小的变化而改变缩放比才是我们这里的重点。首先我们需要判断当前的缩放比是不是自适应缩放比：

```swift
/// Is current magnification match the fit scale.
var isDocumentFit: Bool {
    scrollView.magnification == fitScale
}
```

然后我们需要在窗口尺寸发生变化的时候得到通知。这个问题，以开发者的思维去思考的时候的话，应该是去监听视图层级上最近的发生框架变化的视图。在我们这个例子中，是裁剪视图的框架变化：

```swift
// Posts notifications when clip view frame rectangle changes.
scrollView.contentView.postsFrameChangedNotifications = true

// Observe the changes.
NotificationCenter.default.addObserver(self, selector: #selector(clipViewFrameDidChange(_:)), 
                                                 name: NSView.frameDidChangeNotification,
                                               object: scrollView.contentView)

// When clip view's frame changes
@objc func clipViewFrameDidChange(_ notification: Notification) {
    let newFitScale = currentFitScale()
    
    if isDocumentFit { // more like "wasDocumentFit", because we haven't update `fitScale` yet.
        // set magnification without animation, because we are in live resize.
        setMagnification(newFitScale, animated: false)
    }
    
    fitScale = newFitScale
}
```

<video autoplay muted loop>
  <source src="/assets/mov/5e7f3f1e-3dbc-41dc-86df-b8f4d475a45d.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

好了，我们这就完成了一个基础预览视图的制作。在更复杂的需求下，你可能会需要用页面控制器来添加在非缩放状态下的左右滑动切换照片的功能，或者是缩放时在角落显示一个小地图。再有了上面的基础，这些需求应该难不倒你。

还有一点是我想要指出的，你可能会发现在 Preview 里，通过手势缩放时，缩放到最佳缩放比时会有一点吸附，我在这里并没有讲到怎么实现。不是因为我不知道这个小功能，而是在我的知识范围内，实现这个需要重写 `magnify(with:)`，光是想想就头皮发麻。
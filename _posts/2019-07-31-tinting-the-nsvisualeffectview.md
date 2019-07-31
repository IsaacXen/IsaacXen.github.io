---
layout: post
series: Cocoa 速记
title: 为 NSVisualEffectView 设定自定义颜色
tags: [cocoa, macos, swift, nsvisualeffect, appkit]
---

作为一种设计语言，macOS 在 Yosemite 开始提供了 NSVisualEffectView 来允许我们方便的实现毛玻璃效果。但是，就算是到了 5 年后的现在，除了黑白两色，苹果都没有为 NSVisualEffectView 提供更多的颜色方案。当我们出于设计需要，要求对 NSVisualEffectView 进行着色时，我们就必须自己动手了。

可惜的是，macOS 并没有像 iOS 那样提供分开的 Blur Effect 以及 Vibrant Effect 来供我们自由组合，而是单纯提供一个整合了这些效果的 NSVisualEffectView，只允许我们从预定的材料中进行选择。

这也就意味着，我们只能通过一些奇怪而又特殊的技巧来得到我们期望的效果。

## 方法 1: 修改 Layer 背景颜色

这种方法直接在 NSVisualEffectView 的所有图层里找到某个图层并修改它的背景色。

NSVisualEffectView 使用的图层中，有一个名为 `color copy` 图层可以进行背景色修改，而且这个修改可以在视图中看到，且不会影响到模糊效果。

![](/assets/img/0A248C78-F0B5-4764-A76D-6A0F0ED9937E.png)
*20% Alpha Blue & 20% Alpha Red*

我们可以在 `updateLater()` 方法中进行这一修改。当然，为了防止动画造成修改延迟，我们需要在修改 `backgroundColor` 时禁用动画：

```swift
class TintedVisualEffectView: NSVisualEffectView {
    var tintColor: NSColor = .clear {
        didSet { needsDisplay = true }
    }
    
    override func updateLayer() {
        super.updateLayer()
        
        if let tintedLayer = layer?.sublayers?.first(where: { $0.name == "color copy" }) {
            CATransaction.begin()
            CATransaction.setDisableActions(true) // required to avoid animated color changes
            tintedLayer.backgroundColor = tintColor.cgColor
            CATransaction.commit()
        }
    }
}
```

在 `updateLayer()` 中调用 `super` 中的方法后再进行修改，允许我们的颜色叠加在修改材质等属性后依旧生效。

这种方法存在一些局限的地方：

- **颜色效果不明显。** 为了保留原有的模糊效果，覆盖上去的颜色必须是透明的，这使得覆盖上去的颜色变浅。
- **未来可能失效。** 虽然没有用到私有 API，但通过名字查找图层的方法随时可能因为 API 更新时名字的变更而导致失效。实际上，这个图层的名字在之前已经被修改过一次 (以前是 `ClearCopyLayer`)。

这些问题并不是特别大，因此这种方法也是推荐使用的方法。

## 方法 2: 添加一个颜色叠加视图

这种方法借助了 allowVarbancy 属性的特性。这个属性原本是用来调节放在 NSVisualEffectView 上的控件 (如图形按钮，文字等)，让它们叠加一层模糊的背景，在增加连贯性的同时提高辨识度。

这种效果你会在如 Finder 的侧边栏，或者 App Store 的侧边栏中看到。仔细看它们上面的文字和图标，你就会发现，它们并非纯色，而是带有一点特殊的透明效果的。

![](/assets/img/B3750B9D-3EB4-44DA-AE94-0C92CEE6D6BF.png)
*注意左下方的星星图标与 Discover 文字*

使用这个方法，你只需要在创建一个重写了 `draw(_:)` 方法的视图，让它填充你所设定的颜色。

注意，这里使用的着色方法并非将视图修改成 Layer-Backed 视图后再设置 `layer.backgroundColor` 属性，而是使用绘图来填充颜色。因为不这么做的话，跟上面的方法就没什么区别了。

```swift
class ColorOverlayView: NSView {
    var backgroundColor: NSColor = .clear {
        didSet { needsDisplay = true }
    }
    
    override func draw(_ dirtyRect: NSRect) {
        backgroundColor.setFill()
        dirtyRect.fill()
    }
    
    override var allowsVibrancy: Bool { true }
}
```

此外，我们必须重写 `allowsVibrancy` 并返回 `true` 来加入透明效果。

使用这种方法时，你的视图层级会有如下结构：

```
NSVisualEffectView
+ ColorOverlayView
  + NSTextField
  + NSButton
  + ...
```

借助这种方法的好处在于，你不需要把颜色的透明度调得很低，就算是设置了完全不透明的颜色，它也是透明的。

![60% Alpha Red](/assets/img/3150BF77-0250-43A0-AA73-6F017E21C7A2.png)
*60% Alpha Red*

然而，这种方法的缺点非常的明显：

- **顶层视图的样式会受影响。** 这从图中就可以看到这个问题：在 Aqua 下，位于顶层的窗口控制按钮和其他控件都变暗了，而在 Dark Aqua 下，这些控件反而变亮了。
- **背景颜色会被过度饱和。** `allowVarbancy` 属性本来就会提高背景的饱和度，在设置和较不透明度的颜色时，如果遇到背景颜色接近这个颜色，视图会变得特别鲜艳。这个问题在使用了较为通透的材质的时候尤为明显。

## 小结

不管你选用上面何种方法来实现，你都需要考虑一些额外的问题。

往 NSVisualEffectView 添加颜色并不难，真正难的事情在于让你的这一修改，在不同的环境下保证良好的视觉效果。如不同的壁纸、是否开启黑暗模式、窗口的激活与否、与子视图的协调性...

而这些，都是你在进行开发时应该考虑到。
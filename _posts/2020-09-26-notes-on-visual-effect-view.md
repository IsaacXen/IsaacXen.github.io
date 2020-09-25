---
layout: post
series: Cocoa 速记
title: 又谈 NSVisualEffectView
tags: [cocoa, macos, nsvisualeffectview, swift]
lang: zh
---

似乎从 Catalina 开始，在最近几个版本的 macOS 中，使用一些系统控件的时候，系统会自动在视图层级中插入 `NSVisualEffectView` 来充当控件的背景，如 `NSScrollView` 这些容器视图。

你也许跟我一样，压根就没注意到有这一变动，直到在某些需求下需要修改背景颜色、实现类边栏的半透明效果时，才发现在视图层级中多出了一个不透明的 `NSVisualEffectView`。

![](/assets/img/928a17ec-2dc4-4857-b87c-ab686a4d71a7.jpg)
*被插入的 `NSVisualEffectView` 拥有不透明的材料*

按照以前的方法，我们想都不用想就直接把 `NSScrollView`、`NSClipView` 以及顶层的 `NStableView` 或者 `NSCollectionView` 的背景颜色设置为透明色，或者设置 `drawBackground` 来隐藏掉背景的绘制。

当你满怀欣喜的编译运行，等着透明背景出现的时候，却发现背景还在：

![](/assets/img/92b7d7aa-5d37-4c66-9829-cc9157ac262d.png)
*然而，什么都没有发生*

让事情更加懊恼的是，查文档也好，改属性也罢，你找不到任何公开的方法来修改或隐藏它。

#### 变通方法

作为一个合格的 AppKit 开发者，我们自然而然的会想到重写。`didAddSubview(_:)` 也许是最佳的隐藏它的地方:

```swift
class ScrollView: NSScrollView {
    override func didAddSubview(_ subview: NSView) {
        super.didAddSubview(subview)

        if subview is NSVisualEffectView {
            subview.isHidden = true
        }
    }
}
```

> 但别在这里用 `removeFromSuperView()` 方法将其移除，你会发现他会重新被插入到视图层级中。

![](/assets/img/7f900903-a40b-4005-b823-297f5e170e8a.png)
*可算是透明了*

但是，这么做的效果看起来总是差了什么，特别是你要在上面显示某些选中项的时候：

![](/assets/img/9e24a1db-4c44-4506-a466-3797e8248aa0.png)

发现了吗？左边的选中高亮是纯色不透明的，而右边系统 Spotlight 的高亮却带有一丝通透。

如果我们要实现这种通透效果，我们需要自行重写高亮的绘制，禁用掉默认的绘制，然后通过插入一个 `material` 为 `selection`，并且 `isEmphasized` 为 `true` 的 `NSVisualEffectView` 来实现这种效果。

> 还记得 App Store 以及 Finder 侧边栏高亮选中项的效果吗？其实他们也是通过同样的 `NSVisualEffectView` 实现的，只不过，它们的 `isEmphasized` 属性被设置成了 `false`。

### 其实我们有个更好的方法

在大多数情况下，我们会实现这种半透明效果往往是在侧边栏上，或者这种可以使用 `NSTableView` 实现的列表型视图。这种时候，我们其实可以直接使用 `NSTableView` 自带的 source list 样式来实现上面说到的所有内容：

```swift
// for macOS 11 Big Sur
tableView.style = .sourceList

// for macOS 10.15 Catalina and older
tableView.selectionHighlightStyle = .sourceList
```

这么做的时候，我们甚至都不需要去隐藏掉上面说的被插入的 `NSVisualEffectView`，也不用自己去实现选中项的高亮通透效果，这些都是 source list 的默认效果。

可惜的是，如果你的设计带有头部或者尾部视图，又想用 `NSTableView` 来实现的话，你在数据源的处理上将会非常的痛苦。在这种情况下，也许用一开始的方法搭配 `NSCollectionView` 会更加容易。
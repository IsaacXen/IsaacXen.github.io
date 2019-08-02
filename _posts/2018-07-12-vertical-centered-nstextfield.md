---
layout: post
series: Cocoa 速记
title: 使 NSTextField 的文本垂直居中
tags: [cocoa, macos, swift, nstextfield, appkit]
---

在进行界面开发的时候，很多时候我们都会想要制作一个看起来更加现代的输入框，而这往往需要修改输入框的高度。最后，你会发现，输入框的文字是上对齐的。并且，NSTextField 没有提供现成的方法来修改文本在垂直方向上的对齐位置。

为了修改文本在垂直方向上的位置，我们将会需要自行实现一个 NSTextField，确切来说，是 NSTextFieldCell。

NSTextField 中的文字是通过绘图绘制在上面的，而实际进行的绘制是在 Cell 中进行的。NSTextFieldCell 中有几个方法值得我们的注意:

- `drawInterior(withFrame:in:)`: 这个方法绘制的是 Text Field 内部元素。主要是文字，但是不包括背景和边框。
- `select(withFrame:in:editor:delegate:start:length:)`: 这个方法绘制的是编辑状态时 Text Field 内部元素，包括文字，选中的高亮等，但是同样不包括背景和边框。

我们虽然可以直接重写这两个方法来进行自定义绘制，但是这样难免太繁琐。实际上，这两个方法都是根据传入的 frame 进行绘制的。我们可以对这个 frame 稍加修改，让系统绘制到我们所期望的位置上。

NSTextFieldCell 中有另外一个方法:

- `titleRect(forBounds:)`: 这个方法返回以传入 frame 为边界的绘制文字所需要的 frame。

我们可以借助这个方法来很方便的计算出正确的绘制文字的 frame。

首先，我们重写 `titleRect(forBounds:)` 方法，将绘制的 frame 往下移动一部分:

```swift
class VerticalCenteredTextFieldCell: NSTextFieldCell {
  override func titleRect(forBounds rect: NSRect) -> NSRect {
    // call super to get its original rect
    var rect = super.titleRect(forBounds: rect)
    // shift down a little so the draw rect is vertically centered in cell frame
    rect.origin.y += (rect.height - cellSize.height) / 2
    // finally return the new rect
    return rect
  }
}
```

然后，我们在 `drawInterior(withFrame:in:)` 和 `select(withFrame:in:editor:delegate:start:length:)` 这两个方法中传入经过我们修改的值:

```swift
class VerticalCenteredTextFieldCell: NSTextFieldCell {
  override func drawInterior(withFrame cellFrame: NSRect, in controlView: NSView) {
    // call super and pass in our modified frame
    super.drawInterior(withFrame: titleRect(forBounds: cellFrame), in: controlView)
  }

  override func select(withFrame rect: NSRect, in controlView: NSView, editor textObj: NSText, delegate: Any?, start selStart: Int, length selLength: Int) {
    // call super and pass in our modified frame
    super.select(withFrame: titleRect(forBounds: rect), in: controlView, editor: textObj, delegate: delegate, start: selStart, length: selLength)
  }
}
```

这样就好了，我们的 `VerticalCenteredTextFieldCell` 将会将文字居中绘制在 TextField 中。

现在我们可以将我们自己的 `VerticalCenteredTextFieldCell` 来替换 NSTextField 中的 cell 了。但是，由于我们替换了 cell，这意味着系统生成 NSTextField 的时候对 cell 进行的配置会被重制。我们还需要对这些属性进行重新配置:

```swift
let textField = NSTextField(frame: .zero)
// first replace the cell to out custom one
textField.cell = VerticalCenteredTextFieldCell(textCell: "")
// then reset the text field's default value
textField.isBordered = true
textField.backgroundColor = NSColor.controlBackgroundColor
textField.isBezeled = true
textField.bezelStyle = .squareBezel
textField.isEnabled = true
textField.isEditable = true
textField.isSelectable = true
textField.cell?.isScrollable = true
```

> 上面展示的是纯代码替换 cell。如果你使用的是 Interface Builder，你只需要将 text field 下的 cell 类改成我们重写的这个类即可。

![image](/assets/img/72ACFBB8-9025-4911-ABED-B94524F406BE.png)

我们通过这样的方法将文本进行垂直居中。实际上，对上面的代码稍加修改，我们可以让文本显示在任何地方，从而实现如上对齐、下对齐等效果。

> 这一方法同样适用于 `NSSecureTextField`，你只需要重写 `NSSecureTextFieldCell` 即可。

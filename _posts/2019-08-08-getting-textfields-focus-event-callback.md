---
layout: post
series: Cocoa 速记
title: 获得文本框焦点回调事件
tags: [cocoa, macos, swift, appkit, nstextfield, nssearchfield]
lang: zh
---

在网页开发中，我们可以轻松地使用 onFocus、onBlur 这样的事件来在文本框得到或者失去焦点时获得回调，但意外的是，在 AppKit 中却没有这样的事件回调，需要我们自行获取。

NSTextField 继承于 NSResponder，这似乎暗示着我们可以通过 `becomeFirstResponder` 和 `resignFirstResponder` 来轻松获取文本框的焦点事件。但事情并没有这么简单。

## Field Editor

当你在文本框中输入文字的时候，其实你并不是将文字输入到文本框之中，而是一个隐藏的 NSTextView 对象里去。实际上，每个窗口都有一个全局共享的 NSTextView 对象来处理该窗口下所有控件的文字处理，我们称这个对象为 field editor。

对于当前活动状态的文本框而言，AppKit 会自动把 field editor 插入到这个文本框的视图层级中去，从而为这个文本框提供文本显示、输入和编辑功能。而当焦点切换到另一个文本框时，AppKit 则会自动将这个 field editor 插入到这个新的文本框中。

如果你不熟悉窗口内 field editor 的运作，你可能会感到非常困惑。因为窗口的第一响应者是这个不可见的 field editor，而非你在屏幕上看到的聚焦着的控件。

在你文本框获得焦点时 (如点击文本框)，会发生下面的一系列事情：

- 文本框成为第一响应者
- AppKit 将 field editor 插入到文本框视图层级中
- 文本框卸下第一响应者
- field editor 成为第一响应者

根据这些事情，我们可以通过当前文本框是否有 field editor 来判断出当前的文本框是否聚焦。

> 更多关于 field editor 的内容，请查阅 [Cocoa Text Architecture Guide](https://developer.apple.com/library/archive/documentation/TextFonts/Conceptual/CocoaTextArchitecture/Introduction/Introduction.html#//apple_ref/doc/uid/TP40009459-CH1-SW1) 下的 [Working with the Field Editor](https://developer.apple.com/library/archive/documentation/TextFonts/Conceptual/CocoaTextArchitecture/TextEditing/TextEditing.html#//apple_ref/doc/uid/TP40009459-CH3-SW29) 一节。

## 获取事件

对于得到焦点事件，在 NSTextField 子类中，只需要在 `resignFirstResponder()` 中判断当前文本框将卸下第一响应者，并且文本框还拥有 field editor 的时候，便是该文本框得到焦点的时候：

```swift
override func resignFirstResponder() -> Bool {
    let resign = super.resignFirstResponder()
    
    if resign, let _ = currentEditor() {
        // focused
    }
    
    return resign
}
```

而失去焦点就更简单了。失去焦点时，`textDidEndEditing(_:)` 会被调用，直接使用它即可：

```swift
override func textDidEndEditing(_ notification: Notification) {
    // blured
}
```

## 创建回调方法

知道了焦点事件回调的时机以后，创建回调方法就很简单了。我们可以编写一个代理协议或者 target/action 来创建回调方法，在这里，我们使用创建代理协议的方法：

```swift
@objc protocol TextFieldFocusDelegate {
    @objc optional func textFieldDidGainFocus(_ textField: NSTextField)
    @objc optional func textFieldDidLoseFocus(_ textField: NSTextField)
}
```

NSTextField 已经有一个代理对象引用可以使用，我们不需要再创建一个引用。直接通过借助这个代理对象即可：

```swift
class TextField: NSTextField {
    override func resignFirstResponder() -> Bool {
        let resign = super.resignFirstResponder()
        
        if resign, let _ = currentEditor() {
            (delegate as? TextFieldFocusDelegate)?.textFieldDidGainFocus?(self)
        }
        
        return resign
    }
    
    override func textDidEndEditing(_ notification: Notification) {
        (delegate as? TextFieldFocusDelegate)?.textFieldDidLoseFocus?(self)
        super.textDidEndEditing(notification)
    }
}
```

这样，在使用的时候，只要设置了代理对象，并且这个对象同时还实现了我们的 `TextFieldFocusDelegate`，那么，这个对象的方法便会被调用：

```swift
extension ViewController: NSTextFieldDelegate, TextFieldFocusDelegate {
    override func viewDidLoad() {
        textField.delegate = self
    }

    func textFieldDidGainFocus(_ textField: NSTextField) {
        // do somethings
    }
    
    func textFieldDidLoseFocus(_ textField: NSTextField) {
        // do some other things
    }
}
```

## 小结

协议中的 `textFieldDidLoseFocus(_:)` 实际上是没必要的，因为我们可以直接使用 `textDidEndEditing(_:)` 方法。

这里介绍的方法同样适用于 `NSSearchField` 或者 `NSSecureTextField` 等，因为它们都是 NSTextField 的子类。

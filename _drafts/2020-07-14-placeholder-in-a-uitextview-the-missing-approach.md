---
layout: post
series: Cocoa Touch Quicknote
title: Placeholder in a UITextView - The Missing Approach
tags: [uikit, uitextview, swift]
lang: en
---

I'm kinda late in the iOS development game, when I first tried to add a placeholder to a text view today, I never expect a "Value of type `UITextView` has no member `placeholder`" error when I type `textView.placeholder`.

Things get a bit more of a let-down when I saw an answers with more that 600 up-votes on Stack Overflow telling you to manipulate the text and color yourself within multiple delegate methods to fake a placeholder, follows by another 200 up-voted answer telling you to add a `UILabel` on top of it.

Being as a developer with AppKit background, I think we could do better. When I said better, I means do this:

- without occupying the `delegate` property
- without setting the `text` and `textColor` back and forward
- withoud dealing with the cursor position
- without introducting another view object and managing its visibility

But first, let's create a subclass for this.

## Creating the Subclass

```swift
class TextView: UITextView { ... }
```

First thing first, we need a variable to store the placeholder string:

```swift
var placeholder: String = "" {
    didSet { _ = observer }
}
```

On `didSet`, we trigger the initilization of the observer for `textDidChangeNotification`. This is how we observe the event while keeping the `delegate` untouched:

```swift
private let observer: NSObjectProtocol = {
    NotificationCenter.default.addObserver(forName: UITextView.textDidChangeNotification, object: self, queue: .main, using: { [weak self] _ in
        self?.setNeedsDisplay()
    })
}()
```

Notice that we are using lazy initialized globals to create the observer. This guarantees the initilizer are called only once.

> Remenber to remove the observer when it's no longer needed.

Now here comes the fun part. We had call `setNeedsDisplay()` in the event callback to triger a redraw. As you had probably guessed it, we draw the placeholder:

```swift
override func draw(_ rect: CGRect) {
    super.draw(rect)
    
    guard !placeholder.isEmpty, text.isEmpty else { return }
    
    let attributedString = NSAttributedString(string: placeholder, attributes: [
        .font: font!,
        .foregroundColor: UIColor.tertiaryLabel
    ])
    
    let drawRect = rect.inset(by: textContainerInset).insetBy(dx: textContainer.lineFragmentPadding, dy: 0)
    attributedString.draw(with: drawRect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)
}
```

We calculate the `drawRect` of the text within the text view, and draw it with `usesLineFragmentOrigin` option. This draw our placeholder in the proper position and also wrap the placeholder into multi-line if needed.

What's more, since we are drawing the placeholder without manipulating the `text` and `color` property, there's no need to reset the cursor position or update the state.

Finally, we trigger a view redraw when the view moves to a new hierarchy:

```swift
override func didMoveToSuperview() {
    super.didMoveToSuperview()
    setNeedsDisplay()
}
```

And that's it! No need to import another framework just for this, no need to write a bounch of code in delegate methods. Just a single subclass.

![](/assets/img/20071401.gif)

Why do complicated things when you can just draw it?
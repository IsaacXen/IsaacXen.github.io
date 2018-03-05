---
title: Detecting File Dragging in Cocoa
---

Sometime you may want to show a floating window to provide a place to drop when user dragged a file. Here is how.

<!--more-->

## Monitoring Mouse Drag Event

There's a function in [`NSEvent`](https://developer.apple.com/documentation/appkit/nsevent) called [`addGlobalMonitorForEvent(matching:handler:)`](https://developer.apple.com/documentation/appkit/nsevent/1535472-addglobalmonitorforevents) that allows us to monitor mouse event system-wide. Since we are only interested in mouse drag event, we could add monitor like this:

```swift
NSEvent.addGlobalMonitorForEvent(matching: .leftMouseDragged) { event in
  // left mouse did dragged
}

NSEvent.addGlobalMonitorForEvent(matching: .leftMouseUp) { event in
  // left mouse did released
}
```

Now we get a callback when user is dragging a file, a window, or even a rectangle on desktop. Next step is to filter those event and find out what user are dragging is a file.

_Note: [`addGlobalMonitorForEvent(matching:handler:)`](https://developer.apple.com/documentation/appkit/nsevent/1535472-addglobalmonitorforevents) monitor event system-wide __except__ the app that begin the monitoring. If your want to monitor event system-wide including the one that receive events, make sure you also use [`addLocalMonitorForEvent(matching:handler:)`](https://developer.apple.com/documentation/appkit/nsevent/1534971-addlocalmonitorforevents)._

## Filtering Event: The Right (But End Up Wrong) Way

Whenever we are dragging, the system-defined drag pasteboard would store items that are being dragged, so it would be easy for us to filter using `NSPasteboard.PasteboardType.fileURL`, which indicate a file with a `URL` path to it.

```swift
let pasteboard = NSPasteboard(name: .drag)
guard let _ = pasteboard.propertyList(forType: .fileURL) else {
  // we are dragging a file!
}
```

But sadly, [Apple didn't make it that easy to us](http://www.openradar.me/radar?id=5027980136939520). When dragging a window, the last file info is still in pasteboard, which make it impossible to judge whether we are dragging a file or a window. Ouch!

## Filtering Event: The Right Way

If we can't use pasteboard to do the job, what else can we use?

There's a developer tool that comes with Xcode called `Accessibility Inspector` (Xcode -> Open Developer Tool -> Accessibility Inspector), which did exactly want we want: inspecting object under the pointer. Apple is also kind enough providing the [sample code of this app](https://developer.apple.com/library/content/samplecode/UIElementInspector/Introduction/Intro.html#//apple_ref/doc/uid/DTS10000728).

Dive into the source code, we know  [`Carbon`](https://developer.apple.com/documentation/applicationservices/carbon_accessibility) framework is the magic block we want. We can ask Accessibility API for UI Element under the pointer and check whether it is a file.

There're two function we need: [`AXUIElementCopyElementAtPosition`](https://developer.apple.com/documentation/applicationservices/1462077-axuielementcopyelementatposition) and [`AXUIElementCopyAttributeValue`](https://developer.apple.com/documentation/applicationservices/1462085-axuielementcopyattributevalue).

`AXUIElementCopyElementAtPosition` takes three arguments: an `AUIElement` and a pointer location (x and y), and return a optional `AXUIElement` under the pointer.

`AXUIElementCopyAttributeValue` takes two arguments: an `AUIElement` and a attribute name. This return the value for this attribute.

There's a attribute `kAXFilenameAttriute` which indicate the filename associated with the accessibility object. Only a file has a filename, so we can finally judge whether we are dragging a file by judging whether the accessibility object under the pointer has a filename.

First, we need to create a system-wide `AXUIElement`:

```swift
let systemWideElement = AXUIElementCreateSystemWide()
```

Then we need to get current mouse location:

```swift
let mouseLocation = NSEvent.mouseLocation
```

One thing to remember is that `NSEvent.mouseLocation` return a `NSPoint` at bottom-left relative screen coordinates, but `AXUIElementCopyElementAtPosition` accept a point at top-left relative screen coordinates. So we need to convert it.

To do so, we can make a small helpful extension like this:

```swift
extension NSPoint {
    func verticalFlippedInScreen() -> NSPoint {
        guard let screen = (NSScreen.screens.first { NSPointInRect(self, $0.frame) }) else { return .zero }
        let screenHeight = screen.frame.height
        return NSPoint(x: x, y: screenHeight - y - 1)
    }

    var separatedFloatValue: (Float, Float) {
        return (Float(x), Float(y))
    }
}
```

Now getting the mouse position is as easy as:

```swift
let (x, y) = mouseLocation.verticalFlippedInScreen().separatedFloatValue
```

Now we can call the `AXUIElementCopyElementAtPosition` function:

```swift
var element: AXUIElement?
if AXUIElementCopyElementAtPosition(systemWideElement, x, y, &element) == .success {
    // `element` now represent the top-most accessibility object under the pointer.
}
```

Next we can get its filename:

```swift
var value: CFTypeRef?
if AXUIElementCopyAttributeValue(element, kAXFilenameAttribute as CFString, &value) == .success {
  // `value` now represent the filename of `element`.
}
```

`value` is a optional value, so it is as easy as:

```swift
guard let _ = value else { return }
// `element` is a file!
```

_Note: This works only when dragging a file in finder. If you want this apply to like  when dragging an image inside an application, fell free to add other attribute name to examine, or even combine it with the result of pasteboard's propertyList._

There you have it, this is how to detecting a file dragging. One thing to remember: If your app is sandboxed, you may found this not working. In this case, you may want to send a email to Apple, tell them what you want to do with this API, and ask them to send you a slightly different `.entitlements` file.

If they don't, then you need to find another way around, or consider distributing your app outside Mac App Store.

## Complete Code

```swift
// properties for preventing consistently calling
var mouseDidDragged = false
var shouldCallForMouseDrag = true
// a system-wide AXUIElement
let systemWideElement = AXUIElementCreateSystemWide()

// MARK: Listen for fileDrag event

NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDragged) { event in
    if self.shouldCallForMouseDrag {
        self.shouldCallForMouseDrag = false
        self.mouseDidDragged = true

        // getting mouse position
        let (x, y) = NSEvent.mouseLocation.verticalFlippedInScreen().sepratedFloatValue

        // getting accessibility object under the pointer
        var element: AXUIElement?
        guard AXUIElementCopyElementAtPosition(self.systemWideElement, x, y, &element) == .success  else {
            return
        }

        // ask accessibility API for filename attribute
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element!, kAXFilenameAttribute as CFString, &value) == .success else {
            return
        }

        // check whether there's a filename exist
        guard let _ = value else {
            return
        }

        print("we are dragging a file!")
        // do your thing here
    }
}

NSEvent.addGlobalMonitorForEvents(matching: .leftMouseUp) { event in
    if self.mouseDidDragged {
        self.shouldCallForMouseDrag = true
        self.mouseDidDragged = false

        // undo your thing here
    }
}

// MARK: Helpful NSPoint Extensions

extension NSPoint {
    func verticalFlippedInScreen() -> NSPoint {
        guard let screen = (NSScreen.screens.first { NSPointInRect(self, $0.frame) }) else { return .zero }
        let screenHeight = screen.frame.height
        return NSPoint(x: x, y: screenHeight - y - 1)
    }

    var separatedFloatValue: (Float, Float) {
        return (Float(x), Float(y))
    }
}
```

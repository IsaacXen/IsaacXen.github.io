---
title: Cocoa Handy Helpers
summary: Some useful functions and extensions for macOS in Swift.
---

Some useful functions and extensions for macOS in Swift 4.

Update at anytime.

## AutoLayout

### Add constrains cleaner

```swift
extension NSView {

    /// Adds multiple constraints on the layout of the receiving view or its subviews.
    ///
    /// Reference: [Swift: Facebook Messenger - Auto Layout Using Code or Programmatically (Ep 1)](https://www.youtube.com/watch?v=XtEoKixIfG4)
    ///
    /// - Parameters:
    ///   - format: The format specification for the constraints. The keys of views must be the string values begin with a `v` and follow by number begin from 0.
    ///   - views: Views that appear in the visual format string. Begin from v0.
    func addConstrains(withVisualFormat format: String, views: NSView...) {
        var viewDictionary = [String: NSView]()

        for (index, view) in views.enumerated() {
            let key = "v\(index)"
            viewDictionary[key] = view

            view.translatesAutoresizingMaskIntoConstraints = false
        }

        addConstraints(NSLayoutConstraint.constraints(withVisualFormat: format, options: NSLayoutFormatOptions(), metrics: nil, views: viewDictionary))
    }

    /// Adds a constraint on the layout of the receiving view or its subviews.
    ///
    /// Reference: [Swift: Facebook Messenger - Auto Layout Using Code or Programmatically (Ep 1)](https://www.youtube.com/watch?v=XtEoKixIfG4)
    ///
    /// - Parameters:
    ///   - view1：The view for the left side of the constraint.
    ///   - attribute1：The attribute of the view for the left side of the constraint.
    ///   - relation: The relationship between the left side of the constraint and the right side of the constraint.
    ///   - view2: The view for the right side of the constraint.
    ///   - attribute2: The attribute of the view for the right side of the constraint.
    ///   - constant: The constant added to the multiplied attribute value on the right side of the constraint to yield the final modified attribute. 0 by default.
    ///   - multiplier: The constant multiplied with the attribute on the right side of the constraint as part of getting the modified attribute. 1 by default.
    func addConstrain(_ view1: Any, _ attribute1: NSLayoutAttribute, _ relation: NSLayoutRelation, to view2: Any?, _ attribute2: NSLayoutAttribute, plus constant: CGFloat = 0, multiply multiplier: CGFloat = 1) {
        if let itemView = item as? NSView {
            itemView.translatesAutoresizingMaskIntoConstraints = false
        }
        addConstraint(NSLayoutConstraint(item: view1, attribute: attribute1, relatedBy: relation, toItem: view2, attribute: attribute2, multiplier: multiplier, constant: constant))
    }
}
```

## Text

### Calculate text size with given width

```swift
extension NSAttributedString {

    /// Calculates and returns bounding rectangle for the receiver drawn using the options specified, within the given rectangle in the current graphics context.
    ///
    /// - Parameters:
    ///   - width: The width of the rectangle to draw in.
    ///   - options: The string drawing options. [.usesFontLeading, .usesLineFragmentOrigin] by default.
    /// - Returns: The bounding rectangle size in the current graphics context.
    func boundingSize(withWidth width: CGFloat, options: NSString.DrawingOptions = [.usesFontLeading, .usesLineFragmentOrigin]) -> CGSize {
        let size = NSMakeSize(width, CGFloat(Int.max))
        return boundingRect(with: size, options: options).size
    }
}
```

## File

### Check if path is a file or directory

```swift
/// Check the given path is a file or a directory.
///
/// Reference: [swift - Check if path is a directory in Swift2? - Stack Overflow](https://stackoverflow.com/a/37225557/6692025)
///
/// - Parameters:
///   - path: Path of file to be check.
/// - Returns: `true` for file and `false` for directory, `nil` if not exist.
func isFile(at path: String) -> Bool? {
	var isDirectory: ObjCBool = false
	if FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory) {
		return isDirectory.boolValue    
	}
	return nil
}
```

## Network

### Checks if connected to wireless network

```swift
/// Checks if is connected to a wireless network.
///
/// Reference: [How to programmatically check if Mac is connected to Wi-Fi network?](https://stackoverflow.com/a/31780651/6692025)
///
/// - Returns: 'true' if connected to a wireless network, 'false' if not.
func isWIFIActive() -> Bool {
    guard let interfaceName = CWWiFiClient.interfaceNames() else {
        return false
    }

    for interfaceName in interfaceName {
        if let interface = CWWiFiClient.shared().interface(withName: interfaceName) {
            if interface.ssid() != nil {
                return true
            }
        }
    }

    return false
}
```

### Get MAC address of primary interface

```swift
/// Get MAC address of primary network interface.
///
/// Reference: [How to get MAC address from OSX with Swift](https://stackoverflow.com/a/31838645/6692025)
///
/// - Returns: String of MAC address, nil if no interface found
func getMACAddress() -> String? {
    let matchingDict = IOServiceMatching("IOEthernetInterface") as NSMutableDictionary
    matchingDict["IOPropertyMatch"] = [ "IOPrimaryInterface" : true]

    var primaryInterface = io_iterator_t()
    guard IOServiceGetMatchingServices(kIOMasterPortDefault, matchingDict, &primaryInterface) == KERN_SUCCESS else {
        return nil
    }

    var macAddress = [UInt8](repeating: 0, count: 6)

    var intfService = IOIteratorNext(primaryInterface)
    while intfService != 0 {

        var controllerService = io_object_t()
        if IORegistryEntryGetParentEntry(intfService, "IOService", &controllerService) == KERN_SUCCESS {
            let dataUM = IORegistryEntryCreateCFProperty(controllerService, "IOMACAddress" as CFString, kCFAllocatorDefault, 0)

            if let data = dataUM?.takeRetainedValue() as? NSData {
                data.getBytes(&macAddress, length: macAddress.count)
            }

            IOObjectRelease(controllerService)
        }

        IOObjectRelease(intfService)
        intfService = IOIteratorNext(primaryInterface)
    }

    return macAddress.map({ String(format:"%02x", $0) }).joined(separator: ":")
}
```

### Convert IPV4 to IPV6

```swift
/// Convert IPV4 address string to compatible IPV6 address string.
///
/// - Parameters:
///   - ipv4: String of IPV4 address to be convert.
/// - Returns: Compatible IPV6 address, `nil` if IPV4 address is invalid.
func convertToIPV6(with ipv4: String) -> String? {
    var result = "::"

    let octets = ipv4.components(separatedBy: ".")

    guard octets.count == 4 else {
        return nil
    }

    for (index, octetStr) in octets.enumerated() {
        if let octet = Int(octetStr) {

            guard octet >= 0 && octet < 256 else {
                return nil
            }

            var hex = String(format: "%x", octet)
            hex = hex.count < 2 ? "0\(hex)" : hex

            result += index == 2 ? ":\(hex)" : hex
        } else {
            return nil
        }
    }

    return result
}
```

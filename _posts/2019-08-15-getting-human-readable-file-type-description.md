---
layout: post
series: Cocoa 速记
title: 获取人类可读的文件类型描述
tags: [cocoa, macos, swift, appkit, uti]
lang: zh
---

在 Finder 中，当你选中某个文件时，你可以查看这个文件的类型描述。如选中 `.zip` 文件时，你会得到如 “Zip 归档” 的描述。这是怎么做到的？

![](/assets/img/69CC4FFC-634D-4FC5-9201-9B1E7D8EC82C.png)

## UTIs 简介

首先我们需要简单介绍一下 UTIs。UTIs (Uniform Type Identifiers) 是用来唯一标识抽象类型的字符串。它可以用来描述文件类型、内存中数据的类型或者其他实体的类型。

对于常见格式的 UTIs，如 `.png`、`.txt`、`html` 等，macOS 中都有完善的预定义信息。而对于自定义的类型，UTIs 的定义会存放在程序 bundle 的 plist 里。

这些 UTIs 的定义包括了继承关系、标签、类型声明等，而类型声明中可以包括版本号、图标、技术文档链接，以及我们这里最关心的本地化描述。

> 更多关于 UTIs 的内容，可参阅：
> - [UTType](https://developer.apple.com/documentation/mobilecoreservices/uttype)
> - [Uniform Type Identifiers Overview](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/understanding_utis/understand_utis_intro/understand_utis_intro.html#//apple_ref/doc/uid/TP40001319)

## 获取指定 UTI 的本地化描述信息

在 Core Service 里有一系列 UTIs 相关的 [UTType](https://developer.apple.com/documentation/mobilecoreservices/uttype) API，其中 [`UTTypeCopyDescription(_:)`](https://developer.apple.com/documentation/coreservices/1448514-uttypecopydescription) 允许我们获取指定 UTIs 的本地化描述。

不过在此之前，我们需要将我们的文件类型字符串 (如 `zip`) 转换为 UTI。我们可以通过 [`UTTypeCreatePreferredIdentifierForTag(_:_:_:)`](https://developer.apple.com/documentation/coreservices/1448939-uttypecreatepreferredidentifierf) 或 [`UTTypeCreateAllIdentifiersForTag(_:_:_:)`](https://developer.apple.com/documentation/coreservices/1447261-uttypecreateallidentifiersfortag) 方法来进行转换：

```swift
let uti = UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, "zip", nil)?.takeUnretainedValue()
```

> `kUTTagClassFilenameExtension` 对应的是最常见的文件类型格式。如果你拥有的是 MIME 类型的文件格式，你可以使用 `kUTTagClassMIMEType` 来替代。

然后，我们就可以使用

```swift
let description = UTTypeCopyDescription(uti)?.takeUnretainedValue()
```

来得到该 UTI 的本地化描述了。

> 同样的，你也可以使用 `NSWorkspace.shared.localizedDescription(forType:)` 并传入该 `uti` 来获取相同的结果。

### 为未提供本地化描述的 UTIs 提供通用描述

UTIs 中的本地化描述是可选的，这意味着，对于某些特殊的文件类型，我们是获取不到它们的本地化描述的，因为它们根本不存在。

对于这种情况，一种方法是在找到 UTI 关联的程序后，从它的 Info.plist 文件中搜索使用可用的描述:

```swift
guard
    // `uti` is the uti string from above
    let url = LSCopyDefaultApplicationURLForContentType(uti, .all, nil)?.takeUnretainedValue() as URL?,
    // load info.plist into dictionary
    let plist = NSDictionary(contentsOf: url.appendingPathComponent("Contents/Info.plist")),
    // find the subnode of document types
    let docTypes = plist.object(forKey: "CFBundleDocumentTypes") as? [NSDictionary]
else { return }

// loop throught all document types and find if there's any match uti
for docType in docTypes {
    if let types = docType.object(forKey: "CFBundleTypeExtensions") as? [CFString], types.contains(fileType) {
        // if so, we can retrive the type name
        let description = docType.object(forKey: "CFBundleTypeName") as? String
        return description
    }
}
```

另一种方法是找到与该 UTI 关联的程序，使用本地化的程序名来进行描述。如 Visual Studio Code 的 `.code-workspace` 格式，可以 ”Visual Studio Code 文档“ 来描述:

```swift
guard
    let url = LSCopyDefaultApplicationURLForContentType(uti, .all, nil)?.takeUnretainedValue() as URL?,
    let plist = NSDictionary(contentsOf: url.appendingPathComponent("Contents/Info.plist")),
    let displayName = plist.object(forKey: "CFBundleDisplayName") as? String
else { return }

return displayName + " " + "Document"
```

## 小结

你最终获取文件类型描述的代码应该结合上面提到的多个方法。在一种办法行不通的时候，使用另一种方法来当作备选方法。

此外，上面的代码省略了固定文本的本地化处理，因为本文重点不在这。

另外，本来以为在沙盒环境下访问其他程序 Info.plist 的操作会失败的，结果实际上去尝试了以后发现是可以进行的，很奇怪。
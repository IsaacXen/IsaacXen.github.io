---
layout: post
series: 生命、宇宙，以及一切
title: 记一次 HC5661 的救砖过程
tags: [life, router, hardware]
lang: zh
---

在我读大学的时候买了个 HC5661 路由器来刷 Openwrt 拨通校园网并开启无线网。大学毕业后的某一天，我试图将 Openwrt 替换为其他固件。不幸的是，它砖了，我甚至没有办法进入 Breed 后台。

最后，我使用了 RecoveryTool[^1] 来恢复官方 `0.9005-5384s` 固件。然后我就炸了 -- 我没有办法开启 SSH 访问。

之前的刷机我已经开启了开发者模式，刷入过 Breed，并且，没有保留密匙。现在恢复了官方固件，Breed 和密匙都被擦除了。这导致了一个非常尴尬的情况：

- 为了刷入 Breed，我必须进入云平台开启开发者模式。
- 由于没有密匙，云平台拒绝被访问，更别说开启开发者模式了。
- 从 9005 版本开始，固件禁止刷自制或第三方固件。RecoveryTool 恢复的刚好就是这个版本。
- `0.9007.1.7117s` 之前的版本可以借助搜狐视频插件的漏洞来启动 SSH 服务，但是因为进不去云平台，没法安装插件。

我几乎放弃了所有希望，准备让我这台 HC5661 吃灰。幸运的是，我最后在 [IPTV Fans](http://www.iptvfans.cn/wiki/index.php/%E6%9E%811S%E5%9B%BA%E4%BB%B6%E9%99%8D%E7%BA%A7) 中找到了一个特殊的官方固件[^2]。

## 刷入 0.9005.4778s 版本固件
`0.9005.4778s` 版本的原厂固件是一个神奇的存在 -- 也许是由于某位开发者的疏忽，这个固件的 dropbear 服务没有被关闭。这意味着：

- 这个固件是官方的，它的签名可以被路由所认可。你可以借助 TFTP 直接刷入。
- 刷入后，你无需任何操作，就可以使用 SSH 连接路由器后台。我们可以完全绕过进入云平台开启开发者模式等繁琐步骤。这一点在我这个例子中尤为重要。

> 这里使用的是 macOS 系统，且已经将固件重命名为 `recovery.bin`。

1. 复制 `0.9005.4778s` 版本固件到 `/private/tftpboot`
    > ```
    > cp recovery.bin /private/tftpboot/recovery.bin
    > ```
    {:.indent}
2. 修改目录与文件权限
    > ```
    > sudo chmod 777 /private/tftpboot
    > sudo chmod 777 /private/tftpboot/*
    > ```
    {:.indent}
3. 断开路由电源并使用网线将电脑与路由的任意 Lan 口连接
4. 手动设置电脑的 IP 为以下：
	- IP: 192.168.1.88
	- 子网掩码: 255.255.255.0
	- 网关: 192.168.1.1
5. 启动 TFTP 服务
    > ```
    > sudo launchctl load -F /System/Library/LaunchDeamons/tftp.plist
    > sudo launchctl start com.apple.tftpd
    > ```
    {:.indent}
6. 按住 Reset 按钮不放接通路由电源

你现在可以看到文件被传输到路由中去。传输完成后，路由会开始自动刷机，这需要花费几分钟的时间。

结束后，你可以修改电脑 IP 为自动获取。现在，你可以通过在浏览器访问 `192.168.199.1` 来访问路由后台，并且可以在后台上看到固件版本为 `0.9005.4778s`。同时，你也可以使用 SSH 访问到路由后台。

## 后续: 刷入 Breed

为了防止手贱，提前刷入由 @hackpascal 开发的 [Breed Bootloader](https://www.right.com.cn/forum/thread-161906-1-1.html) 以给未来的自己留一条后路。

我下载的是 `breed-mt7620-hiwifi-hc5761.bin`。为了方便起见，我将它重命名为 `breed.bin`。

1. 保持路由接通电源并开机

2. 使用 SCP 将 breed 固件复制到路由器的 `/tmp` 中

    > ```
    > scp breed.bin root@192.168.199.1:/tmp/breed.bin
    > ```
    >
    > 密码为路由后台密码，如果你没有做任何修改的话，输入 `admin` 。
   {:.indent}

3. 使用 SSH 连接到路由器后台

    > ```
    > ssh root@192.168.199.1
    > ```
    >
    > 密码为路由后台密码，如果你没有做任何修改的话，输入 `admin` 。
    {:.indent}

4. 使用 `mtd` 命令刷入 breed
    > ```
    > mtd -r write /tmp/breed.bin u-boot
    > ```
    {:.indent}

这样，breed 就被刷入了。你可以跟随以下步骤验证 breed 是否被成功刷入。

1. 断开路由器电源
2. 按住 HC5661 的 Reset 按钮不放，接通 HC5661 的电源
3. 等待电脑获取 IP 地址后松开 Reset 按钮
4. 通过浏览器访问 192.168.1.1

如果你看到了 Breed 后台，恭喜你，breed 已被成功刷入。

## 小结

最后我还是给刷入了 [Gargoyle](https://www.gargoyle-router.com/download.php) 的固件，凑合着用。讲道理，在这个年代，不支持 5 GHz 的 HC5661 基本上是拿来当有线交换机用了，当时校园网就 4 兆，觉得 2.4 GHz 够用，现在想想只能怪当初自己太年轻。

写完这篇以后有了个骚想法，感觉可以把 0.9005.4778s 的固件拷贝到 RecoveryTool 去，直接用 RecoveryTool 直接刷进去。不过我已经懒得试了，小白鼠就换你来当吧。

[^1]: 适用于 HC5661, HC6361, HC5361 以及其他型号的恢复工具: [小极修砖神器](/assets/attachment/hiwifi-recovery-tool-1.0.3.zip).
[^2]: 适用于 HC5661 的 0.9005.4778s 固件: [hc5661-0.9005.4778s-recovery.bin](/assets/attachment/hc5661-0.9005.4778s-recovery.bin).
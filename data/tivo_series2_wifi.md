title: TiVo Series 2 and Wifi
date: 2006-01-06
filename: ./tech/tips/tivo_series2_wifi.txt

My wife and I recently bought a TiVo Series2 for ourselves, as well as
a second one as a gift for my parents.  Both are set up to use WiFi as
their connection to the TiVo home office. Both were a pain in the
!#$#@ to set up for WiFi.

As you might expect, WiFi on the TiVo is a huge boon: not only can the
TiVo download scheduling information without being connected to the
phone, it can also communicate with PC's on your local network. TiVo
provides a program that runs on your PC, TiVo desktop, that allows it
to share MP3 files and pictures with the TiVo box itself. With that
setup, you can play MP3's over your TV (or stereo) and browse digital
pictures using your TiVo remote control. It's a wonderful, wonderful
feature.

The dark cloud around this silver lining is the fact that the design
of the TiVo box makes it difficult to find a WiFi adapater that
actually works with the TiVo. There is no Ethernet port on the back of
the TiVO, so you have to use a USB WiFi adapter to connecte it to the
network. Maybe its the fact that TiVo runs Linux, but for whatever
reason the TiVo is <b>very, very picky</b> about which WiFi adapters
work and which don't.  Fortunantly, they provide a <a
href="http://customersupport.tivo.com/knowbase/root/public/tv2006.htm">
list of supported adapters</a>: read it (all of it), live it, love it.
TiVo has also started selling their own adapter, which might be the
simplest way to get started. It's not even all that expensive ($50).

The other thing to be aware of is that the TiVo boxes that are
currently shipping (eg: both of the ones we bought in the last few
months) are running TiVo OS version 5.x, and the WiFi adpaters we used
weren't supported until version 7.2.1. I don't know why they're
shipping TiVo's with OS's that are 2 major revisions out of date, but
there it is: you need to update your brand new TiVo to get current
WiFi support. To get the new update, you need to have your TiVo wired
into the Phone as part of the initial startup. TiVo will download the
OS update when it connects to the home office (you can explicitly ask
it to connect, which seems to work for triggering the update). Once
you get the updated firmware, you can set up the networking, axe the
phone line, and bring your TiVo's connectivity out of the early-90's.

Once set up, WiFi seems to work very reliably: we haven't had any
trouble. The only real remaining issue we're working through is that
my wife uses a VPN to log into her work on the same PC we're using to
run the TiVo desktop server. (Can you see where this is going?) Of
course when the VPN is up it keeps the TiVo from seeing TiVo desktop
and accesing our MP3 files. There are a couple approaches to solve
this, but haven't done anything about it yet.

One more thing: the TiVo Series 3, <a
href="http://www.tivolovers.com/252572.html">announced today</a>, has
10/100Base-T Ethernet on the back panel. Now there's a good reason not
to pick the TiVo $300 "Lifetime of the box" service plan.

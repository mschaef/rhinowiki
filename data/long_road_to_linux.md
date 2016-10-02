title: The long^H^H^H^Hshort road to Linux...
date: 2006-09-15
filename: ./tech/linux/long_road_to_linux.txt


I ran Linux for a few years back in college ('94-'97), lapsing back to
Windows for professional reasons when I started working full
time. After ten years of running Windows full time, I finally got sick
of its crap (excuse my French), replaced the 40GB disk on my Dell
Inspiron 6000 laptop with a brand new 120GB and installed Ubuntu
6.06. Two partitions: one swap and one ext3. No Windows partition, no
dual boot. This happened a couple days ago, and the experience has
been almost uniformly positive. To wit:


* Suspend to memory and (more importantly) suspend to disk both
  worked properly the first time out of the box, no questions asked.
  The only 'issue' is that the fit and finish isn't quite as nice
  as on Windows. Windows has a nice progress bar for the suspend
  process and on Linux the display goes through a couple corrupt
  screens full of noise before getting to the desktop.

* The widescreen 2MP display was recognized immediately. Installing
  the Ubuntu packages for flgrx got 3-D acceleration on my <i>ATI
  Radeon X300</i> working with <b>no trouble at all</b>. All I need
  to do now is get a nice compositing window manager. <i><b>Update:</b>
  ATI's X300 driver deliberately doesn't with the 
  <a href="http://www.freedesktop.org/wiki/Software/CompositeExt">Composite extension</a>
  necessary to run a compositing window manager. Oh well.</i>

* WiFi almost worked out of the box, the exception being the Wifi activity
  light on the laptop's case. It never lights up, which made enabling
  the radio confusing but doesn't seem to have caused any other problems.

* The base Ubuntu is pretty sparse, but it was trivial to install 2GB
  worth of development tools with Synapitics after the install.
  Synaptics works well enough that I question why bother with Fedora's
  5CD install process. (Out of a historical sympathy for Redhat 6, I first
  tried installing Fedora Core 5 and had a hard time getting Windows XP to
  do a valid burn of CD 3. This is why I wound up with Ubuntu.) 

* Plugging in USB keys and drives worked out of the box the first time,
  even for read-only accsss of my <i>NTFS formatted</i> external 120GB
  disk.

* A video recorded on my wife's Canon SD400 showed up with a thumbnail
  in Nautilus and played, with audio, with the default media player.

* Audio worked out of the box, even the annoying startup sounds.

* The qemu emulator and tne kqemu accelerator (hopefully, my Windows
  solution) both compiled and ran easily. <i><b>Update:</b> All I
  had to do do boot Windows XP was start qemu with an image
  created by saying <tt>dd if=/dev/sdb of=orig.img</tt>. Of course,
  Windows XP immediately started complaining about not being activated.
  We'll see if MS lets me reactivate it: I have a license to run XP
  on this machine, even if the expectation was that I'd run it on
  raw hardware rather than via emulation. Oh, and it's too soon to
  really tell about performance, but it looks usable for filling
  out timecards, etc.</i>

* I wasn't expecting it, but I've been able to open and work with
  several work-related Word for Windows documents using OpenOffice.

Of course there are problems, but overall <b>this is amazing</b>. The
last time I ran Linux, it took weeks of downloading and compiling
source code and extensive script customization to get things to work
right. Setting up X11 to not blow up my then brand new $1,300 Sony
GDM-17SE1 17 inch monitor gave me night sweats for days. Once it did
work, there were half a dozen different widget sets on the screen at
any time and your choices for word processing included Andrew ez,
groff, and/or TeX. Linux has come a long way.


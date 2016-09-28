title: Apple's new iBook
date: 2005-07-27
filename: ./tech/apple/apple_ibook_refresh.txt

As rumored, <a href="http://www.apple.com/ibook/">Apple just refreshed
the iBook</a>. The other rumor, the one about a new chassis and a
widescreen display, did not come true. Between that and Apple's
desire not to encroach too much on the PowerBooks, there wasn't
much headroom for major upgrades:

* 2-finger trackpad scrolling.
* Sudden motion sensing for the disk. (Is this done by the disk itself with a built in motion sensor or by the motherboard/CPU?)
* Standard Bluetooth
* A minor speed bump: the peak CPU is now a 1.42GHz G4 with a 142MHz bus.

I was hoping for more, but given Apple's total lack of manuvering room
in the laptop space, this is an understandable bump. If they upgraded the
iBook too much, there'd be little reason to pay extra for the PowerBook.
Since they can't upgrade the PowerBook too much (thanks to the stagnant
G4) they have a natural cap
on the features in the iBook. Thus, Apple is restricted to selling up its
five year old laptop with slogans like  "a fast 133MHz or 142MHz system
bus" *(fast? Dell's [$500 Inspiron 1200](http://www1.us.dell.com/content/products/features.aspx/inspn_1200?c=us&cs=19&l=en&s=dhs) runs its system bus at 400MHz)* and "brilliant 1024 by 768 pixel
resolution" *(maybe it was brilliant five years ago)*.

Anyway, I've recently come to have a theory on the limited display resolution
of Apple's notebooks. It seems obvious in retrospect, but Apple can't
scale up the display resolution since they don't have the CPU or memory
bandwidth to support higher resolutions as well as they want. With modern
display stacks like <a href="http://en.wikipedia.org/wiki/Quartz_Compositor">Quartz</a> and
<a href="http://www.apple.com/macosx/features/quartzextreme/">Quartz Extreme</a>,
pushing pixels around is one of the biggest user-visible performance burdens on a
modern machine (hence, "the snappy").
While <a href="http://arstechnica.com/reviews/os/macosx-10.4.ars/14?81858">a GPU can help</a>,
there's no getting around the fact that if they doubled the resolution, they'd double the number
of bytes their system has to process to render the same sized desktop on the screen.
Given that Apple's best G4's have less than half the main memory bandwidth of the
lowest end Centrinos, there's no wonder Apple's not chomping on the bit to eat
up more of their bus.

Since Apple's first wave of Centrino laptops should bring fixes for all of
this, the computing community has some pretty amazing hardware to look forwards
to in a year or so.







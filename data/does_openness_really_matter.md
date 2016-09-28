title:  Does Openness Matter Anymore?
date: 2008-06-12
filename: ./tech/general/does_openness_really_matter.txt


I was born in 1975. In the 'computer world', this means I grew up at
the tail end of the 8-bit era. By the time I was a teenager the market
was in the middle of deciding whether to go with PC's, the Apple
Macintosh, or <a
href="http://en.wikipedia.org/wiki/DESQview#DESQview.2FX">something
else</a>. Microsoft basically cinched that deal in 1990 with the
release of <a href="http://en.wikipedia.org/wiki/Windows_3.0">Windows
3.0</a>, the first relevant version. A PC running Windows 3.0 wasn't
as nice as a Macintosh, but it didn't matter. If you already had a PC,
you could buy Windows off the shelf for $89, retain all of your
existing hardware and software, and then experiment with the GUI when
you had the time. If typing <tt>win</tt> at a DOS prompt took you down
the rabbit hole, clicking 'Exit Windows' took you right back to your
comfort zone.

Windows 3.0 also had the benefit of a huge installed base of latent
and mostly unused hardware. A typical business PC in 1990 might have
been something like an <a
href="http://en.wikipedia.org/wiki/Intel_80286">80286</a> with 2MB of
RAM, a 40MB disk, and an <a
href="http://en.wikipedia.org/wiki/Enhanced_Graphics_Adapter">EGA</a>
(640x350x4bpp) bitmapped display. It would then be running DOS
software that basically couldn't address more than the first <a
href="http://en.wikipedia.org/wiki/Conventional_memory">640K</a> of
memory, and tf you ever saw the bitmap display in use, it was probably
for a static plot of a graph. Compared to a Macintosh from the same
year, a PC looked positively like something from a totally different
generation. Windows 3.0 changed all this. It allowed you to switch
your 80286 into <a
href="http://en.wikipedia.org/wiki/Protected_mode">'Protected
Mode'</a> to get at that extra memory. It provided a <a
href="http://en.wikipedia.org/wiki/Graphics_Device_Interface">graphics
API</a> (with drivers!) and forced programs to use the bitmapped
display. It provided standard printer drivers that worked for <b>all
Windows programs</b>. Basically, for $89 it took the hardware you
already had and made it look almost like the Macintosh that would
otherwise have cost you thousands of dollars. It was utterly
transforming.

Almost 20 years later, the most interesting thing about this is the
relative timing of the hardware and its software support. Most of the
hardware in my 'typical 1990 PC' was introduced by IBM in its 1984
announcement of the <a
href="http://www.vintage-computer.com/ibmpcat.shtml">IBM PC AT</a>.
The first attempt by IBM and Microsoft to support the 80286 natively
came three years later in 1987's release of <a
href="http://en.wikipedia.org/wiki/OS/2">OS/2</a>. The first
286-native platform to reach mainstream acceptance came in 1990. Think
about that: it took 6 years for the open PC market to develop software
capable of fully utilizing the 80286.  The <a
href="http://en.wikipedia.org/wiki/Intel_80386">80386</a> fared even
worse; The <a
href="http://en.wikipedia.org/wiki/Compaq#Deskpro_386">first 386
machine</a> was released in 1986, and it didn't have a major
mainstream OS until either 1993 or <a
href="http://en.wikipedia.org/wiki/Windows_95">1995</a> (depending on
whether or not you count <a
href="http://en.wikipedia.org/wiki/Windows_NT_3.1">Windows NT 3.1</a>
as 'mainstream'). Thus, there were scores of 286 and 386 boxes that
did nothing more than execute 8086 code really, really fast (for the
time :-)). In modern terms, this is analogous to a vendor introducing
a hardware devide today and then delaying software support until 2018.

This is emblematic of the hugely diminishing value of an open device
platform in today's computer industry. In 1989, using a computer was
largely an exercise in getting the damn thing to work.  When those are
the issues you're worried about as a PC user, an open platform is
helpful because it enables a broader selection of vendors for parts
and software. If you've run out of slots for both your video board and
your bus mouse interface, you can always switch to an ATI video board
with a built-in mouse port. If you need a memory manager that supports
<a href="http://docs.ruudkoot.nl/vcpi.doc">VCPI</a> to enable your <a
href="http://osdev.berlios.de/v86.html">V86</a> multitasker, you can
always switch to something like <a
href="http://en.wikipedia.org/wiki/QEMM">QEMM/386</a>. If you need
more memory to run your spreadsheet, you can go to AST Technolgies and
buy a <a
href="http://www.borrett.id.au/computing/art-1989-01-02.htm">LIM/EMS</a>
board.  When you're worried about these kinds of issues, issues 'low
in the stack', the flexibility of choice provided by openness is
useful enough that you might be more willing to bear the costs of a
market slow to adopt new technologies.

Of course, price is also a factor.  In 1988, Byte magazine ran a
review of Compaq's Deskpro 386s. This was their first <a
href="http://www.borrett.id.au/computing/art-1989-01-02.htm">80386SX</a>
machine, a desktop computer designed to be a cheaper way to run
80386-specific software. The cost of the review machine was something
like $15,000.  In 2007 dollars, this would buy you a nice, reasonably
late-model BMW 3-series. A year later in 1989, my family bought a
similar machine from  ALR, which cost around $3,000. Thus isn't
nearly as bad, but it's still around $5,200 in 2007, which basically
means that a mid-range 1989 PC is priced at the very top end of the
2007 PC market. With monetary costs that high, that other benefit of
openness, price competition, becomes a much bigger deal. Compaq ended
up suffering badly as competition drove the price of the market to
where it is today.

In the intervening 20 years, both of these circumstances have changed
dramtically. PC's, both Windows and Macintosh, are well enough
integrated that nothing needs to be done to get them to run aside from
unpacking the box.  <a
href="http://en.wikipedia.org/wiki/NeXTSTEP">NeXTStep</a>, which in
1994 required a fancy $5,000 PC bought from a custom vendor to run
well, will shortly be able to run (with long-range, high-speed
wireless!) on a <a href="http://www.apple.com/iphone/">$200</a>
handheld bought at your local shopping mall. Our industry has moved up
<a
href="http://en.wikipedia.org/wiki/Maslow%27s_hierarchy_of_needs">Maslow's
hierarchy of needs</a> from expensive, unreliable hardware, run by the
dedicated few to cheap, reliable hardware, run by disinterested
many. We can now concentrate on more interesting things than just
getting the computer to work, and tt is with this shift that the some
of the unique value of openness has been lost. Unfortunately, <i>the
costs have been retained</i>, there is no countervening force in the
market that's forcing open platforms to move any faster.

Personally, I believe this bodes very well for Apple's latest attempt
to own the smartphone space. There will only be one vendor and one
price for the iPhone, but the platform will be able to move faster to
adopt new technolgies, and integrate them more tightly, because
there's only one kind of hardware to run on. The fewer hardware
configurations and stricter quality control guidelines will make it
easier (and more mandatory) that developers produce high quality
software. The fact that entry into the software market is controlled,
doesn't matter, because there are still more eligable developers than
the platform actually needs. The net result of all this is that Apple,
again, has a product that looks 'next generation', but the pricing and
openness factors that cost them that advantage in the early 90's are
no longer there. It's a good time to be involved in the iPhone,
methinks.

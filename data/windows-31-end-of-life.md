title: The End of 16-bit Windows
date: 2008-11-06
filename: ./tech/history/windows-31-end-of-life.txt

In an era in which customers are almost begging Microsoft not to
discontinue Windows XP, I was suprised to see <a
href="http://arstechnica.com/news.ars/post/20081105-microsoft-puts-windows-3-11-for-workgroups-out-to-pasture.html">a
recent news story</a> on the end of life of Windows for Workgroups
3.11 (WfWG).  If you're not completely up on the early history of
Windows, WfWG 3.11 was released in August of 1993, and was the last of
the major US-market versions of Windows without native Win32 support
out of the box. It was also one of a series of Windows releases in the
early 90's that turned Windows from 'the library you need to run
Excel' into a legitimate platform for general purpose computing.

From it's introduction in 1985 until the release of Windows 3.0 in 1990, Windows was almost 
entirely composed of the same basic core: DOS for file access and system startup, and a 
collection of three DLL's (KERNEL, GDI, and USER) for memory management, device independant 
graphics, and the GUI widget library and window manager.  Atop the core sat programs 
written to the Windows API. All of this ran sharing the one 20-bit segmented address space 
provided by x86 real mode: with 640K usable memory.  If you were lucky, you might have had 
a LIM/EMS board that allowed a few MB of extra memory to be addressed through a 64KB window 
at the top of the addres space. If you were <b>really</b> lucky, you might have had a 80386 
computer with a special program that let it pretend its extra memory worked like a LIM/EMS 
board. Needless to say, memory was tight, difficult to use, and dangerous to share it 
between multiple programs.

The solution to this memory problem was initially to be OS/2. OS/2 was the operating system 
part of IBM's vast (and doomed) PS/2 program to recapture the PC space back from clone 
vendors. Like DOS, it was done in partnership with Microsoft, but IBM took a much more 
active role in the design and development of OS/2 than they did with DOS.  OS/2's most 
noteworthy feature was the fact that it was designed to run in 80286 'protected mode' 
rather than the 'real mode' of DOS and Windows. Protected mode, like its name implies, 
added memory protection between processes that made multi-tasking more reliable. Protected 
mode also widened the physical address space of the CPU from 20-bits to 24-bits, making it 
possible to directly address 16MB of memory without resorting to tricks like LIM/EMS 
paging. This was all good, but it was tempered by the fact that OS/2 was expensive to run 
and didn't run DOS programs very well, thanks to its choice of 80286 protected mode over 80386.
The only programs that could actually use the benefits of protected mode under OS/2 
were OS/2-specific software that nobody had.

By the time 1988 rolled around, PC's with the capability of addressing more than 1MB of 
memory had been around since 1984, and there still wasn't a viable mainstream operating 
system that took advantage of this capability. This is when Windows got its big break: 
David Weise at Microsoft <a 
href="http://blogs.msdn.com/larryosterman/archive/2005/02/02/365635.aspx">figured out how 
to run Windows itself in Protected Mode</a>, <i>along with unmodified Windows programs</i>. 
Running existing software in protected mode was something of a holy grail, and Dr. Weise's 
idea ultimately resulted in Windows 3.0, released in 1990 to heady acclaim. Windows 3.0 
also included the V86 multitasker from the older Windows/386 product. This meant Windows 
3.0 could do things OS/2 could not do, like run multiple DOS programs at the same time and 
run them in graphical windows on the desktop.

Windows 3.0 ended up being a runaway sales success, and after its release, the rest of the 
dominos fell fairly quickly. Microsoft's partnership with IBM effectively ended, with IBM 
getting a source licence to Microsoft products through the early 1990's. IBM ultimately 
used this license to develop a special version of Windows they bundled with OS/2 2.0 to let 
Windows programs run under OS/2 ("a better Windows than Windows" went the ad). Microsoft's 
own 32-bit OS/2 2.0 got dropped, and the work done on OS/2 NT (3.0) ultimately formed the 
basis for 1993's Windows NT and the Win32 API. The next version of 16-bit Windows, Windows 
3.1, dropped support for real mode entirely, and as it evolved into Windows 95, more and 
more system services were moved into 32-bit code. This 16/32-bit hybrid version of Windows 
lasted until Windows Me.  It was definately barouque, and ended up notoriously unreliable, 
but its evolution from 256K 8088's to 128MB Pentiums is to my eye one of the more 
impressive examples of evolutionary software engineering. I don't miss using these versions 
of Windows, but it's easy to miss the 'brave new world' spirit they embodied.

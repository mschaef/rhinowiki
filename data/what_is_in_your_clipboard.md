title: What's in *your* clipboard...
date: 2006-06-23
filename: ./tech/excel/what_is_in_your_clipboard.txt

The clipboard is one of the oldest and most often used data exchange
mechanisms in Microsoft Windows.  It's been around since Windows 1.0
and basically all applications use it to support operations like copy,
cut, and paste. One of the more interesting aspects of the way the
clipboard works is that it allows applications to copy data to the
clipboard in multiple formats.  For example, if you copy text in
Microsoft Word to the clipboard, it's not copied in one format, it's
copied in seventeen. One way to see this is to open the Clipbook
viewer application (start>>run, clipbrd.exe), open the Clipboard
window, and look at the list of data formats in the view sub menu.
This is how different applications negotiate data formats when copying
and pasting data; this is why you can copy a spreadsheet from
super-smart Excel, paste it into super-dumb Notepad, and still get
reasonable results.

In the process of adding better clipboard support to vCalc, I wrote a
small tool for dumping clipboard contents to a console window. This
tool, <a href="http://www.mschaef.com/cbdump.zip">cbdump</a>, runs
from the command line and shows a list of all the data formats
currently on the clipboard. It can also dump out the data in
hexadecimal format, so you can see the actual data, unaltered by
applications. To show what it looks like, here's sample output after
copying a small Excel table to the clipboard:

```text
c009: "DataObject"  (4 bytes)
000e: CF_ENHMETAFILE  (0 bytes)
0003: CF_METAFILEPICT  (16 bytes)
0002: CF_BITMAP  (0 bytes)
c2e2: "Biff8"  (5120 bytes)
c2e6: "Biff5"  (4608 bytes)
c1f3: "BIFF4"  (1904 bytes)
c2e3: "Biff3"  (1773 bytes)
c2f7: "Biff"  (913 bytes)
0004: CF_SYLK  (1131 bytes)
c2ec: "Wk1"  (197 bytes)
0005: CF_DIF  (137 bytes)
c298: "XML Spreadsheet"  (943 bytes)
c0f2: "HTML Format"  (2344 bytes)
000d: CF_UNICODETEXT  (22 bytes)
0001: CF_TEXT  (11 bytes)
c295: "Csv"  (11 bytes)
c0a5: "Rich Text Format"  (3071 bytes)
c00b: "Embed Source"  (6144 bytes)
c004: "Native"  (6144 bytes)
c003: "OwnerLink" ERROR in GetClipboardData
c00e: "Object Descriptor"  (152 bytes)
c00d: "Link Source"  (135 bytes)
c00f: "Link Source Descriptor"  (152 bytes)
c1f2: "Link"  (31 bytes)
0081: CF_DSPTEXT  (13 bytes)
c002: "ObjectLink"  (39 bytes)
c013: "Ole Private Data"  (792 bytes)
0010: CF_LOCALE  (4 bytes)
0007: CF_OEMTEXT  (11 bytes)
0008: CF_DIB  (57368 bytes)
0011: CF_DIBV5  (57452 bytes)
150642 bytes
```

The leftmost column is the integer ID of the clipboard format. This is
the ID used by Windows to identify the format used by a particular
chunk of data. Following the ID is the clipboard format's name, of
which there are two kinds.  By default, Windows knows about a few
predefined types of clipboard data: these are identified by constants
in the header file and are things like CF_TEXT (text data) and CF_DIB
(a device indepentant bitmap).  However, to handle the case where one
of the Windows default formats will not work, Windows also allows
applicatons to register additional formats and give them useful names.
In the list above, that includes formats like "XML Spreadsheet", "Csv",
and "Biff8". This allows applications like Excel to communicate rich,
specialized data to applications that support it (Excel itself being
a good example).

A couple paragraphs ago, I used the word 'negotiate' when referring to
the way that two applications use the clipboard to exchange data. As
currently presented, that negotiation looks a lot like the source
application making everything available and the sink application
cherry picking the one format it wants.  This is not a very balanced
or efficient negotiation. However, the clipboard is actually more
intelligent than that.  To see what I mean, go to Excel, copy a huge
range of data to the clipboard and run cbdump. The output list of
formats will basically be the same as before, the difference is in the
way the list appears. You'll notice that the list scrolls past
unevenly, jerking along with some formats taking longer to list than
others.

The reason for the uneven scrolling is that Windows does not force an
application to always provide data in every clipboard format it
supports. When Excel copies data to the clipboard, what it's really
doing is telling Windows that it has the ability to provide data in a
format, it is not necessarily rendering the data in every format at
the time of the copy. Then, when a sink application requests data from
the clipboard, Windows can see if it has an actual copy of the
requested format. If not, it then requests that Excel render the
clipboard contents in the requested format and passes that result to
the requesting application. The way cbdump works, to show the size
of each data format on the clipboard, it requests a copy of each
available data format. This forces Excel to render every supported 
format, some of which take longer than others. If you happened to
have a Windows message viewer looking at the message stream to
the Excel window, you'd see a series of window messages requesting
rendered copies of unrendered formats.

title: Excel, CR/LF, and CSV
date: 2008-02-01
filename: ./tech/excel/cr-lf.txt


I've spent a fair amount of time lately working with code that
generates Comma Seperated Value files for loading into Excel.  You'd
think the format would be trivial, but
[not quite](http://www.creativyst.com/Doc/Articles/CSV/CSV01.htm#EmbedBRs).
One additional subtlety, one not covered in that
'specification', is Excel's inconsistent handling of end of line
markers. As it turns out, if Excel loads a CSV file that contains a
quoted, multi-line value, it expects a different line feed convention
within the quoted value than the usual CR/LF. A CR embedded in a
quoted field renders as a box, rather than as part of a newline.  To
suppress the box, CSV files for Excel need to be written with a
LF-only convention within quoted values. Even then, Excel will not
automatically expand rows containing a multi-line value. That has to
be done manually.

Internally, Excel seems to follow the same LF-only convention that
this issue with CSV files seems to imply.  Taking the `CODE(...)` of
each character in a manually entered multi-line cell value, shows only
one charater, a LF, at each line break. My guess is that the quotes in
a CSV file just act as a signal to turn off **all** special character
handling, not just handling that signals new rows and cells. Either
way, it's more than a little irritating that Excel compatible CSV
files with multi-line values have to have two seperate end of line
conventions.

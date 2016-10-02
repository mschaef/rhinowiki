title: Excel: 'Repeat', the Simplest Macro
date: 2005-10-06
filename: ./tech/excel/the_simplest_macro.txt

This is a simple little two-bit Excel trick that I find myself
using **all the time**, particularly when formatting worksheets.

In Excel, Control+Y is the 'other half' of the Undo/Redo pair.  If you
undo an action and want to redo what you just undid, Control+Y undoes
the undo, so to speak.  However, if you haven't undone anything, and
there's nothing on the redo queue, <b>Control+Y repeats the last
single action you took</b>.

Repeatable actions can actually be quite complex. For example,
opening the Format Cell dialog box and applying a format counts
as one repeatable action, regardless of how many format attributes
you change. Once you make that format change to one cell and <b>before
you do anything else</b> Control+Y has become a key that applies
that specific format change to as many other cells as you like.

In a sense, Control+Y is a command that's eternally bound to a
simple macro that Excel keeps updating with your last action.
If you plan your work to group actions together, this 'automatic'
macro can save a lots of time.

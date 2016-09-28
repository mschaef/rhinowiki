title: List filtering with Formulas in Microsoft Excel: Motivation
date: 2005-07-18
filename: ./tech/excel/list_filter_0_motivation.txt


One of Excel's more interesting features for querying data sets is the
AutoFilter. Applied to a table of data in a spreadsheet, The
AutoFilter allows the table to be queried for subsets of data based on
combo boxes in the table's header row. It's a simple way to filter out
extraneous data and it can support quite elaborate query semantics
(since it can filter based on values in computed cells).

However, AutoFilter is not without its problems:

* AutoFilter imposes its own user interface: if you want a
  look-and-feel other than stock, you're out of luck.

* For wide data tables with lots of columns, it can be hard to see
  the current AutoFilter query. To see the entire query requires
  horizontal scrolling down the header row.

* Cell formatting and AutoFilter are independant of each other.
  If you want position dependant formatting (alternate row
  formatting, for example), it has to be recreated
  after each AutoFilter adjustment.

* An AutoFilter works by selectively 'hiding' rows in the
  worksheet it's a part of. This means that an AutoFiltered
  list can't share rows with anything else that you don't
  also want selectively 'filtered' from view.

* You can't have more than one AutoFilter on a worksheet tab.

* AutoFilter isn't part of the natural 'ebb and flow' of
  the life of a spreadsheet: it doesn't participate in the
  dependancy driven formula solver that drives Excel's
  computational capability. This has some profound (bad)
  implications:

  * As data rows are added and removed from the list being 
    AutoFiltered, the AutoFilter has to be removed and
    reapplied to the new data list to reflect changes to its
    source.

  * You can't use AutoFilter to filter a list and then search
    that list with <tt>=LOOKUP()</tt> or <tt>=MATCH()</tt>: the
    lookup operation will search the <b>entire</b> list, not
    the filtered list.

  * If you AutoFilter a list that contains calculated cells,
    and those cells change value, the set of filtered rows is
    not updated.

Anyway, I could go on, but I hope it's pretty clear by now that there
are sometimes good reasons to look for other list filter mechanisms
than AutoFilter. <i>(FYI: 'Advanced Filter' has its own limitations,
some of which are very similar to AutoFilter's.)</i> I'll post a way
to get AutoFilter-like behavior directly from Excel formulas. This
technique has its own issues, but it does address lots of the issues I
mentioned here.

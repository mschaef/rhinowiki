title: PS: I think that AutoFilter is typical of Excel...
date: 2005-07-18
filename: ./tech/excel/ps.txt

I think that the weaknesses of the Excel AutoFilter turn out to be
pretty typical of Excel in general.

To me, the brilliance of the spreadsheet was that it took a data model
that business people were familar with, the accountant's paper
spreadsheet, and layered on automatic computation and reporting
facilities in a natural way. There's something very intuitive about
going to cell c1, entering <tt>=A1+B1</tt>, and then having C1 contain
the sum of the other two cells, automatically updated as the source
cells change. It just makes sense, and is at the very core of every
software spreadsheet dating back to the first, VisiCalc.

For years, spreadsheets worked at making this model work better.
Lotus 1-2-3 introduced something called <i>natural recalculation
order</i> that made it easier to follow the logic of spreadsheet
calculation. Somewhere along the way, spreadsheets started doing
limited recalculation, where formulas that didn't change weren't
recalculated (thus saving time). New intrinsic functions were added,
and Excel made a huge stride when it added array formulas: individual
formulas that can produce more than one result. The gateway to user
defined functions written in VisualBASIC was another huge win.

The core strength of all of these ideas is that they rely on and
extend the core concept of the software spreadsheet: the software
tracks dependancies between cells and <b>automatically recalculates
the appropriate results as necessary</b>. As powerful as that concept
is, Microsoft lost the plot somewhere around Excel 4 or 5 and keeps
sinking money and effort into features that don't fully participate:

* Excel has two data filter features: neither one can automatically update
  a table as a part of recalculation.

* PivotTables don't update when their source data updates either. (For SQL
  data sources, this is understandable, but not so much when the source
  data comes from Excel itself).

* PivotTables produce tables with missing values (to improve the
  formatting), which makes them very difficult to query with 
  spreadsheet lookup functions.

* The historgram function (among others) of the Analysis ToolPak
  is a one-time thing: you use it, it generates a histogram, and
  that's it. It's not possible to incorporate histogram generation
  into the dataflow driven recalculation of a spreadsheet.

* There's no way to use an Excel formula to determine if a row
  is excluded or included in an AutoFilter query. Actually,
  there's no way to have the result set of an AutoFilter query
  drive spreadsheet recalculation at all.

Maybe this is being picky, but spreadsheets have a real strength in that they
made it a lot easier for non-techies to specify how a computer can automatically
solve certain types of problems. It's just a shame that so many of Excel's
features are excluded from the natural way Excel is programmed.
